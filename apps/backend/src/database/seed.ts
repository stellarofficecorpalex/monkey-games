import { createConnection } from 'typeorm';
import { User } from './entities/user.entity';
import { Game, GameType } from './entities/game.entity';

async function seed() {
  const connection = await createConnection({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'monkey_games',
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true,
  });

  console.log('🌱 Seeding database...');

  // Create admin user
  const userRepository = connection.getRepository(User);
  const existingAdmin = await userRepository.findOne({ where: { username: 'admin' } });

  if (!existingAdmin) {
    const admin = userRepository.create({
      username: 'admin',
      email: 'admin@monkey.games',
      password: '$2b$10$K7L1OJ45/4Y2nYOvh2xB3.F9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ', // admin123
      balance: 10000,
      isAdmin: true,
      isActive: true,
    });
    await userRepository.save(admin);
    console.log('✅ Admin user created (username: admin, password: admin123)');
  }

  // Create games
  const gameRepository = connection.getRepository(Game);

  // Space Monkey - Crash
  const existingCrash = await gameRepository.findOne({ where: { type: GameType.CRASH } });
  if (!existingCrash) {
    const crashGame = gameRepository.create({
      type: GameType.CRASH,
      name: 'Space Monkey',
      description: 'Космическая краш-игра. Успей забрать выигрыш до крушения!',
      rtp: 96.0,
      minRtp: 70.0,
      maxRtp: 99.0,
      isActive: true,
      config: {
        minBet: 1,
        maxBet: 10000,
        autoCashoutRange: [1.01, 1000],
      },
    });
    await gameRepository.save(crashGame);
    console.log('✅ Space Monkey (Crash) game created');
  }

  // Plinko Monkey
  const existingPlinko = await gameRepository.findOne({ where: { type: GameType.PLINKO } });
  if (!existingPlinko) {
    const plinkoGame = gameRepository.create({
      type: GameType.PLINKO,
      name: 'Plinko Monkey',
      description: 'Бросай мяч и выигрывай до 35x! Классический Plinko.',
      rtp: 96.0,
      minRtp: 70.0,
      maxRtp: 99.0,
      isActive: true,
      config: {
        minBet: 1,
        maxBet: 10000,
        rows: [8, 10, 12, 14, 16],
      },
    });
    await gameRepository.save(plinkoGame);
    console.log('✅ Plinko Monkey game created');
  }

  await connection.close();
  console.log('🎉 Seeding completed!');
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
