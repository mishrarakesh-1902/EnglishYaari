import mongoose from 'mongoose';
import { connectDatabase } from './database';
import { Teacher } from './models';

async function seedTeacher(): Promise<void> {
  try {
    await connectDatabase();
    const email = 'demo.teacher@example.com';
    const teacher = await Teacher.findOneAndUpdate(
      { email },
      { $setOnInsert: { fullName: 'Demo Teacher', email, specialization: 'English', experience: 5 } },
      { upsert: true, new: true, runValidators: true },
    );
    console.log(`Teacher ID: ${teacher._id}`);
  } finally {
    await mongoose.disconnect();
  }
}

void (async () => {
  try {
    await seedTeacher();
  } catch (error) {
    console.error('Could not seed the teacher', error);
    process.exitCode = 1;
  }
})();
