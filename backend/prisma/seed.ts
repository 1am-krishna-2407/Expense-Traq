/**
 * Demo-data seed (Plan §8 / §28).
 *
 * Real users never need this: their default categories are created inside the
 * registration transaction (see authRepository.createUserWithDefaults). This script only
 * creates a demo account with six months of realistic data so the app can be explored
 * immediately. It goes through the real service layer, so every validation rule applies.
 *
 *   npm run db:seed        (idempotent — recreates the demo user each run)
 */
import { prisma } from '../src/config/db';
import { authService } from '../src/modules/auth/auth.service';
import { budgetsService } from '../src/modules/budgets/budgets.service';
import { categoriesService } from '../src/modules/categories/categories.service';
import { expensesService } from '../src/modules/expenses/expenses.service';
import { formatIsoDate } from '../src/utils/dates';

export const DEMO_USER = {
  name: 'Krishna Sharma',
  email: 'demo@rupeeflow.app',
  password: 'Demo@12345',
};

// Deterministic pseudo-random so every seed run produces the same dataset.
let state = 42;
const rand = () => {
  state = (state * 1103515245 + 12345) % 2 ** 31;
  return state / 2 ** 31;
};
const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];
const between = (min: number, max: number) => Math.round((min + rand() * (max - min)) / 10) * 10;

const TEMPLATES: Record<string, { descriptions: string[]; min: number; max: number; perMonth: number }> = {
  Food: {
    descriptions: ['Dinner with friends', 'Swiggy order', 'Groceries — BigBasket', 'Cafe Coffee Day', 'Zomato lunch'],
    min: 150, max: 1800, perMonth: 9,
  },
  Transport: {
    descriptions: ['Uber to office', 'Metro card recharge', 'Petrol refuel', 'Ola airport ride'],
    min: 120, max: 1500, perMonth: 6,
  },
  Utilities: {
    descriptions: ['Electricity bill — BESCOM', 'JioFiber broadband', 'Mobile recharge', 'Water bill'],
    min: 300, max: 2400, perMonth: 3,
  },
  Entertainment: {
    descriptions: ['Movie IMAX tickets', 'Netflix subscription', 'Concert pass', 'Bowling night'],
    min: 200, max: 2000, perMonth: 3,
  },
  Health: {
    descriptions: ['Pharmacy — Apollo', 'Gym membership', 'Doctor consultation'],
    min: 250, max: 3000, perMonth: 2,
  },
  Shopping: {
    descriptions: ['Woodland shoes', 'Uniqlo shirts', 'Amazon — headphones', 'Myntra order'],
    min: 600, max: 4500, perMonth: 2,
  },
};

const BUDGETS: Record<string, number> = {
  Food: 10000,
  Transport: 6000,
  Utilities: 5000,
  Entertainment: 4000,
  Health: 4000,
  Shopping: 6000,
};

async function main() {
  await prisma.user.deleteMany({ where: { email: DEMO_USER.email } });
  const { user } = await authService.register(DEMO_USER);
  const userId = user.id;

  // One extra user-defined category on top of the defaults, plus one archived example.
  await categoriesService.create(userId, { name: 'Shopping', color: '#EF4444' });
  const categories = await categoriesService.list(userId, true);
  const other = categories.find((c) => c.name === 'Other');
  if (other) await categoriesService.update(userId, other.id, { isArchived: true });
  const byName = new Map(categories.map((c) => [c.name, c.id]));

  const today = new Date();
  for (let offset = 5; offset >= 0; offset--) {
    const first = new Date(Date.UTC(today.getFullYear(), today.getMonth() - offset, 1));
    const month = first.getUTCMonth() + 1;
    const year = first.getUTCFullYear();
    const lastDay = offset === 0 ? today.getDate() : new Date(Date.UTC(year, month, 0)).getUTCDate();

    for (const [name, limit] of Object.entries(BUDGETS)) {
      await budgetsService.create(userId, {
        categoryId: byName.get(name) as string,
        month,
        year,
        limitAmount: limit,
      });
    }

    for (const [name, t] of Object.entries(TEMPLATES)) {
      const count = offset === 0 ? Math.ceil((t.perMonth * lastDay) / 30) : t.perMonth;
      for (let i = 0; i < count; i++) {
        const day = 1 + Math.floor(rand() * lastDay);
        await expensesService.create(userId, {
          categoryId: byName.get(name) as string,
          amount: between(t.min, t.max),
          description: pick(t.descriptions),
          expenseDate: formatIsoDate(new Date(Date.UTC(year, month - 1, day))),
        });
      }
    }
  }

  console.log(`Seeded demo user → ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
