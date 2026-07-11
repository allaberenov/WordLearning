import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { normalizeWord } from "../src/lib/utils";

const cards = [
  {
    word: "abandon",
    partOfSpeech: "verb",
    transcription: "/əˈbændən/",
    translations: ["оставлять", "покидать", "отказываться от"],
    definitionEn: "To leave a person, place, or thing permanently, or to stop doing something.",
    examples: [
      {
        en: "The family had to abandon their home because of the flood.",
        ru: "Семье пришлось покинуть свой дом из-за наводнения."
      },
      {
        en: "She abandoned the idea after discovering how expensive it would be.",
        ru: "Она отказалась от этой идеи, узнав, насколько дорого это обойдется."
      }
    ]
  },
  {
    word: "achieve",
    partOfSpeech: "verb",
    transcription: "/əˈtʃiːv/",
    translations: ["достигать", "добиваться"],
    definitionEn: "To successfully finish something or get a result through effort.",
    examples: [
      {
        en: "He worked hard to achieve his goal of studying abroad.",
        ru: "Он много работал, чтобы достичь цели учиться за границей."
      },
      {
        en: "The team achieved better results after changing its strategy.",
        ru: "Команда добилась лучших результатов после изменения стратегии."
      }
    ]
  },
  {
    word: "reluctant",
    partOfSpeech: "adjective",
    transcription: "/rɪˈlʌktənt/",
    translations: ["неохотный", "не желающий"],
    definitionEn: "Not willing or eager to do something.",
    examples: [
      {
        en: "She was reluctant to speak in front of a large audience.",
        ru: "Она не хотела выступать перед большой аудиторией."
      },
      {
        en: "The manager was reluctant to approve the risky plan.",
        ru: "Менеджер неохотно одобрял рискованный план."
      }
    ]
  },
  {
    word: "substantial",
    partOfSpeech: "adjective",
    transcription: "/səbˈstænʃəl/",
    translations: ["значительный", "существенный"],
    definitionEn: "Large in size, value, or importance.",
    examples: [
      {
        en: "The company made a substantial investment in new equipment.",
        ru: "Компания сделала значительные вложения в новое оборудование."
      },
      {
        en: "There is substantial evidence that regular practice improves memory.",
        ru: "Есть существенные доказательства того, что регулярная практика улучшает память."
      }
    ]
  },
  {
    word: "maintain",
    partOfSpeech: "verb",
    transcription: "/meɪnˈteɪn/",
    translations: ["поддерживать", "сохранять"],
    definitionEn: "To keep something in good condition or continue it at the same level.",
    examples: [
      {
        en: "You need to maintain your vocabulary by reviewing words regularly.",
        ru: "Нужно поддерживать словарный запас, регулярно повторяя слова."
      },
      {
        en: "The building is expensive to maintain during the winter.",
        ru: "Зимой это здание дорого содержать в хорошем состоянии."
      }
    ]
  }
];

async function main() {
  const passwordHash = await bcrypt.hash("demo12345", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      passwordHash,
      name: "Demo User",
      timezone: "Europe/Moscow",
      settings: {
        create: {
          timezone: "Europe/Moscow",
          interfaceLanguage: "ru",
          newCardsPerDay: 10,
          maxReviewsPerDay: 100,
          desiredRetention: 0.9,
          reviewMode: "FLASHCARD",
          theme: "SYSTEM",
          pronunciationEnabled: true
        }
      }
    }
  });

  const deck = await prisma.deck.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {
      name: "Demo English",
      description: "Стартовый набор для проверки приложения."
    },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      userId: user.id,
      name: "Demo English",
      description: "Стартовый набор для проверки приложения."
    }
  });

  for (const [index, card] of cards.entries()) {
    await prisma.card.upsert({
      where: {
        deckId_normalizedWord_meaningIndex: {
          deckId: deck.id,
          normalizedWord: normalizeWord(card.word),
          meaningIndex: 0
        }
      },
      update: {
        ...card,
        normalizedWord: normalizeWord(card.word),
        dueAt: new Date(Date.now() + index * 60_000)
      },
      create: {
        deckId: deck.id,
        ...card,
        normalizedWord: normalizeWord(card.word),
        dueAt: new Date(Date.now() + index * 60_000)
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
