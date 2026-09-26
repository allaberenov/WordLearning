import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { listDeckSummaries } from "@/lib/decks";
import { getStats } from "@/lib/stats";
import { generateVocabularyCard } from "@/lib/openai";
import { normalizeWord } from "@/lib/utils";
import type { GeneratedCardInput } from "@/lib/schemas";

export async function assertActiveTeacherAccess(teacherId: string, studentId: string) {
  const link = await prisma.teacherStudent.findUnique({
    where: { teacherId_studentId: { teacherId, studentId } },
    include: { student: true }
  });

  if (!link || link.status !== "ACTIVE") {
    throw new ApiError(404, "Студент не найден или еще не подтвердил доступ.", "STUDENT_NOT_FOUND");
  }

  return link;
}

export async function listTeacherRelationships(teacherId: string) {
  const links = await prisma.teacherStudent.findMany({
    where: { teacherId, status: { not: "REMOVED" } },
    include: {
      student: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          decks: { select: { id: true } },
          reviews: { select: { id: true }, take: 1, orderBy: { reviewedAt: "desc" } }
        }
      }
    },
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }]
  });

  const activeStudentIds = links
    .filter((link) => link.status === "ACTIVE")
    .map((link) => link.studentId);
  const cardGroups =
    activeStudentIds.length > 0
      ? await prisma.card.groupBy({
          by: ["deckId"],
          where: { deck: { userId: { in: activeStudentIds } } },
          _count: { _all: true }
        })
      : [];
  const decks =
    activeStudentIds.length > 0
      ? await prisma.deck.findMany({
          where: { userId: { in: activeStudentIds } },
          select: { id: true, userId: true }
        })
      : [];

  const deckOwnerMap = new Map(decks.map((deck) => [deck.id, deck.userId]));
  const cardCountByStudent = new Map<string, number>();
  for (const group of cardGroups) {
    const studentId = deckOwnerMap.get(group.deckId);
    if (!studentId) continue;
    cardCountByStudent.set(studentId, (cardCountByStudent.get(studentId) ?? 0) + group._count._all);
  }

  return links.map((link) => ({
    id: link.id,
    status: link.status,
    requestedAt: link.requestedAt,
    respondedAt: link.respondedAt,
    student: {
      id: link.student.id,
      email: link.student.email,
      name: link.student.name,
      createdAt: link.student.createdAt,
      deckCount: link.status === "ACTIVE" ? link.student.decks.length : 0,
      cardCount: link.status === "ACTIVE" ? cardCountByStudent.get(link.studentId) ?? 0 : 0,
      hasActivity: link.status === "ACTIVE" ? link.student.reviews.length > 0 : false
    }
  }));
}

export async function listIncomingTeacherRequests(studentId: string) {
  return prisma.teacherStudent.findMany({
    where: { studentId, status: "PENDING" },
    include: {
      teacher: {
        select: { id: true, email: true, name: true }
      }
    },
    orderBy: { requestedAt: "desc" }
  });
}

export async function listActiveTeachers(studentId: string) {
  return prisma.teacherStudent.findMany({
    where: { studentId, status: "ACTIVE" },
    include: {
      teacher: {
        select: { id: true, email: true, name: true }
      }
    },
    orderBy: { respondedAt: "desc" }
  });
}

export async function sendTeacherRequest(teacherId: string, studentEmail: string) {
  const student = await prisma.user.findUnique({
    where: { email: studentEmail.toLowerCase() },
    select: { id: true, email: true, name: true }
  });

  if (!student) {
    throw new ApiError(404, "Студент с таким email не найден.", "STUDENT_EMAIL_NOT_FOUND");
  }

  if (student.id === teacherId) {
    throw new ApiError(400, "Нельзя отправить запрос самому себе.", "SELF_STUDENT_REQUEST");
  }

  const existing = await prisma.teacherStudent.findUnique({
    where: { teacherId_studentId: { teacherId, studentId: student.id } }
  });

  if (existing?.status === "ACTIVE") {
    throw new ApiError(409, "Этот студент уже подключен.", "STUDENT_ALREADY_ACTIVE");
  }

  const now = new Date();
  const link = existing
    ? await prisma.teacherStudent.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          requestedAt: now,
          respondedAt: null,
          removedAt: null
        }
      })
    : await prisma.teacherStudent.create({
        data: {
          teacherId,
          studentId: student.id,
          status: "PENDING",
          requestedAt: now
        }
      });

  return { link, student };
}

export async function respondToTeacherRequest(
  studentId: string,
  requestId: string,
  action: "accept" | "decline"
) {
  const request = await prisma.teacherStudent.findFirst({
    where: { id: requestId, studentId, status: "PENDING" }
  });

  if (!request) {
    throw new ApiError(404, "Запрос преподавателя не найден.", "TEACHER_REQUEST_NOT_FOUND");
  }

  return prisma.teacherStudent.update({
    where: { id: request.id },
    data: {
      status: action === "accept" ? "ACTIVE" : "DECLINED",
      respondedAt: new Date(),
      removedAt: null
    }
  });
}

export async function getTeacherStudentPageData(
  teacherId: string,
  studentId: string,
  timezone: string
) {
  const link = await assertActiveTeacherAccess(teacherId, studentId);
  const [stats, decks, recentCards, problemCards, assignedDecksCount] = await Promise.all([
    getStats(studentId, timezone),
    listDeckSummaries(studentId, "lastActivity", timezone),
    prisma.card.findMany({
      where: { deck: { userId: studentId } },
      include: { deck: { select: { id: true, name: true, assignedByTeacherId: true } } },
      orderBy: { createdAt: "desc" },
      take: 25
    }),
    prisma.card.findMany({
      where: { deck: { userId: studentId }, lapses: { gt: 0 } },
      include: { deck: { select: { id: true, name: true } } },
      orderBy: [{ lapses: "desc" }, { reps: "desc" }],
      take: 10
    }),
    prisma.deck.count({
      where: { userId: studentId, assignedByTeacherId: teacherId }
    })
  ]);

  return {
    link,
    student: link.student,
    stats,
    decks,
    recentCards,
    problemCards,
    assignedDecksCount
  };
}

function toCardCreateInput(card: GeneratedCardInput, meaningIndex: number) {
  const normalizedWord = normalizeWord(card.normalizedWord || card.word);
  return {
    word: card.word,
    normalizedWord,
    meaningIndex,
    partOfSpeech: card.partOfSpeech,
    transcription: card.transcription || null,
    translations: card.translations,
    definitionEn: card.definitionEn,
    examples: card.examples
  };
}

export async function createTeacherAssignment(input: {
  teacherId: string;
  studentId: string;
  name: string;
  description?: string;
  words: string[];
}) {
  await assertActiveTeacherAccess(input.teacherId, input.studentId);

  const generatedCards: GeneratedCardInput[] = [];
  for (const word of input.words) {
    generatedCards.push(await generateVocabularyCard(word));
  }

  const meaningCounts = new Map<string, number>();
  const cards = generatedCards.map((card) => {
    const normalizedWord = normalizeWord(card.normalizedWord || card.word);
    const meaningIndex = meaningCounts.get(normalizedWord) ?? 0;
    meaningCounts.set(normalizedWord, meaningIndex + 1);
    return toCardCreateInput(card, meaningIndex);
  });

  return prisma.deck.create({
    data: {
      userId: input.studentId,
      name: input.name,
      description: input.description || null,
      assignedByTeacherId: input.teacherId,
      assignedAt: new Date(),
      cards: {
        create: cards
      }
    },
    include: {
      cards: true
    }
  });
}
