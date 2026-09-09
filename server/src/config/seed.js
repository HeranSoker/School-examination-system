const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { pool } = require('./database');
const fs = require('fs');
const path = require('path');

const fsExists = (p) => {
  try { return fs.existsSync(p); } catch (e) { return false; }
};

const seed = async () => {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Ensure database exists via connection without database option
    const rootConn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'exam_user',
      password: process.env.DB_PASSWORD || 'ExamSystem@123',
    });
    await rootConn.query('CREATE DATABASE IF NOT EXISTS school_exam_system;');
    await rootConn.end();
    console.log('✅ Database school_exam_system verified/created');

    // 2. Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // Strip comments
    schema = schema.replace(/--.*$/gm, '');

    // Split statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'ER_TABLE_EXISTS_ERROR') {
          console.warn('⚠️ Schema warning:', err.message);
        }
      }
    }
    console.log('✅ Schema & tables created successfully\n');

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin123', salt);
    const teacherPass = await bcrypt.hash('teacher123', salt);
    const studentPass = await bcrypt.hash('student123', salt);

    // =====================================================
    // USERS
    // =====================================================
    const users = [
      // Admin
      ['Admin User', 'admin', 'admin@school.edu', adminPass, 'admin', 'active'],
      // Teachers
      ['Dr. Sarah Johnson', 'sjohnson', 'sarah.johnson@school.edu', teacherPass, 'teacher', 'active'],
      ['Prof. Michael Chen', 'mchen', 'michael.chen@school.edu', teacherPass, 'teacher', 'active'],
      ['Ms. Emily Davis', 'edavis', 'emily.davis@school.edu', teacherPass, 'teacher', 'active'],
      // Students
      ['Alex Thompson', 'athompson', 'alex.t@school.edu', studentPass, 'student', 'active'],
      ['Maria Garcia', 'mgarcia', 'maria.g@school.edu', studentPass, 'student', 'active'],
      ['James Wilson', 'jwilson', 'james.w@school.edu', studentPass, 'student', 'active'],
      ['Sofia Martinez', 'smartinez', 'sofia.m@school.edu', studentPass, 'student', 'active'],
      ['Daniel Kim', 'dkim', 'daniel.k@school.edu', studentPass, 'student', 'active'],
      ['Olivia Brown', 'obrown', 'olivia.b@school.edu', studentPass, 'student', 'active'],
      ['Ethan Lee', 'elee', 'ethan.l@school.edu', studentPass, 'student', 'active'],
      ['Ava Robinson', 'arobinson', 'ava.r@school.edu', studentPass, 'student', 'active'],
      ['Liam Harris', 'lharris', 'liam.h@school.edu', studentPass, 'student', 'active'],
      ['Emma Clark', 'eclark', 'emma.c@school.edu', studentPass, 'student', 'active'],
      ['Noah Walker', 'nwalker', 'noah.w@school.edu', studentPass, 'student', 'active'],
      ['Isabella Young', 'iyoung', 'isabella.y@school.edu', studentPass, 'student', 'active'],
    ];

    for (const u of users) {
      try {
        await pool.query(
          'INSERT INTO users (full_name, username, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
          u
        );
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    console.log('✅ Users seeded');

    // =====================================================
    // CLASSES
    // =====================================================
    const classes = [
      ['Grade 10 - Section A', '10', 'A', '2026-2027'],
      ['Grade 10 - Section B', '10', 'B', '2026-2027'],
      ['Grade 11 - Section A', '11', 'A', '2026-2027'],
      ['Grade 11 - Section B', '11', 'B', '2026-2027'],
      ['Grade 12 - Section A', '12', 'A', '2026-2027'],
    ];

    for (const c of classes) {
      try {
        await pool.query(
          'INSERT INTO classes (name, grade, section, academic_year) VALUES (?, ?, ?, ?)',
          c
        );
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    console.log('✅ Classes seeded');

    // =====================================================
    // TEACHERS
    // =====================================================
    const [teacherUsers] = await pool.query("SELECT id FROM users WHERE role = 'teacher' ORDER BY id");
    const teacherData = [
      [teacherUsers[0].id, 'TCH-001', 'Mathematics'],
      [teacherUsers[1].id, 'TCH-002', 'Science'],
      [teacherUsers[2].id, 'TCH-003', 'English'],
    ];

    for (const t of teacherData) {
      try {
        await pool.query(
          'INSERT INTO teachers (user_id, employee_id, department) VALUES (?, ?, ?)',
          t
        );
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    console.log('✅ Teachers seeded');

    // =====================================================
    // STUDENTS
    // =====================================================
    const [studentUsers] = await pool.query("SELECT id FROM users WHERE role = 'student' ORDER BY id");
    const [classList] = await pool.query("SELECT id FROM classes ORDER BY id");

    for (let i = 0; i < studentUsers.length; i++) {
      const classIdx = i % classList.length;
      try {
        await pool.query(
          'INSERT INTO students (user_id, student_id, class_id) VALUES (?, ?, ?)',
          [studentUsers[i].id, `STD-${String(i + 1).padStart(3, '0')}`, classList[classIdx].id]
        );
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    console.log('✅ Students seeded');

    // =====================================================
    // SUBJECTS
    // =====================================================
    const subjects = [
      ['Mathematics', 'MATH101', 'Algebra, Geometry, Calculus fundamentals'],
      ['Physics', 'PHY101', 'Mechanics, Thermodynamics, Optics'],
      ['Chemistry', 'CHEM101', 'Organic and Inorganic Chemistry'],
      ['Biology', 'BIO101', 'Cell Biology, Genetics, Ecology'],
      ['English', 'ENG101', 'Grammar, Literature, Composition'],
      ['Computer Science', 'CS101', 'Programming, Data Structures, Algorithms'],
      ['History', 'HIST101', 'World History, Civilizations'],
    ];

    for (const s of subjects) {
      try {
        await pool.query(
          'INSERT INTO subjects (name, code, description) VALUES (?, ?, ?)',
          s
        );
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
      }
    }
    console.log('✅ Subjects seeded');

    // =====================================================
    // EXAMS WITH QUESTIONS
    // =====================================================
    const [teachers] = await pool.query("SELECT id FROM teachers ORDER BY id");
    const [subjectList] = await pool.query("SELECT id FROM subjects ORDER BY id");

    // Check if exam 1 already exists
    const [existingExams] = await pool.query('SELECT id FROM exams WHERE title = ?', ['Mathematics Midterm Examination']);
    let exam1Id;
    if (existingExams.length === 0) {
      const [examResult] = await pool.query(
        `INSERT INTO exams (title, description, subject_id, teacher_id, duration_minutes, total_marks, pass_marks, start_time, end_time, status, instructions, show_results)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'Mathematics Midterm Examination',
          'Midterm examination covering Algebra and Geometry',
          subjectList[0].id,
          teachers[0].id,
          60,
          50,
          25,
          '2026-09-01 08:00:00',
          '2026-09-30 17:00:00',
          'active',
          'Answer all questions. Each MCQ carries 5 marks. No negative marking. Use of calculators is not allowed.',
          true
        ]
      );
      exam1Id = examResult.insertId;

      // Assign exam 1 to classes
      await pool.query('INSERT INTO exam_classes (exam_id, class_id) VALUES (?, ?)', [exam1Id, classList[0].id]);
      await pool.query('INSERT INTO exam_classes (exam_id, class_id) VALUES (?, ?)', [exam1Id, classList[1].id]);

      // Math questions
      const mathQuestions = [
        {
          text: 'What is the value of x in the equation 2x + 5 = 15?',
          type: 'MCQ', marks: 5, order: 1,
          options: [
            { text: 'x = 3', correct: false },
            { text: 'x = 5', correct: true },
            { text: 'x = 7', correct: false },
            { text: 'x = 10', correct: false },
          ]
        },
        {
          text: 'The derivative of x³ is 3x².',
          type: 'TRUE_FALSE', marks: 5, order: 2,
          options: [
            { text: 'True', correct: true },
            { text: 'False', correct: false },
          ]
        },
        {
          text: 'What is the quadratic formula?',
          type: 'MCQ', marks: 5, order: 3,
          options: [
            { text: 'x = (-b ± √(b² - 4ac)) / 2a', correct: true },
            { text: 'x = (-b ± √(b² + 4ac)) / 2a', correct: false },
            { text: 'x = (b ± √(b² - 4ac)) / 2a', correct: false },
            { text: 'x = (-b ± √(b² - 4ac)) / a', correct: false },
          ]
        },
        {
          text: 'A right triangle has sides 3 and 4. What is the hypotenuse?',
          type: 'MCQ', marks: 5, order: 4,
          options: [
            { text: '6', correct: false },
            { text: '5', correct: true },
            { text: '7', correct: false },
            { text: '8', correct: false },
          ]
        },
        {
          text: 'The sum of interior angles of a triangle is 360°.',
          type: 'TRUE_FALSE', marks: 5, order: 5,
          options: [
            { text: 'True', correct: false },
            { text: 'False', correct: true },
          ]
        },
        {
          text: 'Simplify: (x² - 9) / (x - 3)',
          type: 'MCQ', marks: 5, order: 6,
          options: [
            { text: 'x - 3', correct: false },
            { text: 'x + 3', correct: true },
            { text: 'x² - 3', correct: false },
            { text: '(x - 3)²', correct: false },
          ]
        },
        {
          text: 'What is the area of a circle with radius 7? (Use π ≈ 22/7)',
          type: 'MCQ', marks: 5, order: 7,
          options: [
            { text: '144 sq units', correct: false },
            { text: '154 sq units', correct: true },
            { text: '164 sq units', correct: false },
            { text: '174 sq units', correct: false },
          ]
        },
        {
          text: 'Explain the concept of limits in calculus and provide an example.',
          type: 'SHORT_ANSWER', marks: 5, order: 8,
          options: []
        },
        {
          text: 'The product of two negative numbers is always negative.',
          type: 'TRUE_FALSE', marks: 5, order: 9,
          options: [
            { text: 'True', correct: false },
            { text: 'False', correct: true },
          ]
        },
        {
          text: 'Prove that the sum of the first n natural numbers is n(n+1)/2 using mathematical induction.',
          type: 'ESSAY', marks: 5, order: 10,
          options: []
        },
      ];

      for (const q of mathQuestions) {
        const [qResult] = await pool.query(
          'INSERT INTO questions (exam_id, question_text, question_type, marks, order_number) VALUES (?, ?, ?, ?, ?)',
          [exam1Id, q.text, q.type, q.marks, q.order]
        );
        for (let i = 0; i < q.options.length; i++) {
          await pool.query(
            'INSERT INTO question_options (question_id, option_text, is_correct, order_number) VALUES (?, ?, ?, ?)',
            [qResult.insertId, q.options[i].text, q.options[i].correct, i + 1]
          );
        }
      }
      console.log('✅ Exam 1 (Mathematics) seeded with questions');
    }

    // Exam 2 - Physics Quiz (Scheduled)
    const [existingExam2] = await pool.query('SELECT id FROM exams WHERE title = ?', ['Physics Chapter 1 Quiz']);
    if (existingExam2.length === 0) {
      const [exam2Result] = await pool.query(
        `INSERT INTO exams (title, description, subject_id, teacher_id, duration_minutes, total_marks, pass_marks, start_time, end_time, status, instructions, show_results)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'Physics Chapter 1 Quiz',
          'Quick quiz on Mechanics fundamentals',
          subjectList[1].id,
          teachers[1].id,
          30,
          25,
          13,
          '2026-09-15 09:00:00',
          '2026-09-15 10:00:00',
          'scheduled',
          'Answer all questions carefully. Each question carries 5 marks.',
          false
        ]
      );
      const exam2Id = exam2Result.insertId;
      await pool.query('INSERT INTO exam_classes (exam_id, class_id) VALUES (?, ?)', [exam2Id, classList[0].id]);
      await pool.query('INSERT INTO exam_classes (exam_id, class_id) VALUES (?, ?)', [exam2Id, classList[2].id]);

      const physicsQuestions = [
        {
          text: "Newton's first law of motion is also known as the law of:",
          type: 'MCQ', marks: 5, order: 1,
          options: [
            { text: 'Acceleration', correct: false },
            { text: 'Inertia', correct: true },
            { text: 'Action-Reaction', correct: false },
            { text: 'Gravity', correct: false },
          ]
        },
        {
          text: 'The SI unit of force is the Newton.',
          type: 'TRUE_FALSE', marks: 5, order: 2,
          options: [
            { text: 'True', correct: true },
            { text: 'False', correct: false },
          ]
        },
        {
          text: 'What is the acceleration due to gravity on Earth?',
          type: 'MCQ', marks: 5, order: 3,
          options: [
            { text: '8.9 m/s²', correct: false },
            { text: '9.8 m/s²', correct: true },
            { text: '10.8 m/s²', correct: false },
            { text: '11.2 m/s²', correct: false },
          ]
        },
        {
          text: 'An object at rest will remain at rest unless acted upon by an external force.',
          type: 'TRUE_FALSE', marks: 5, order: 4,
          options: [
            { text: 'True', correct: true },
            { text: 'False', correct: false },
          ]
        },
        {
          text: 'Explain the difference between mass and weight.',
          type: 'SHORT_ANSWER', marks: 5, order: 5,
          options: []
        },
      ];

      for (const q of physicsQuestions) {
        const [qResult] = await pool.query(
          'INSERT INTO questions (exam_id, question_text, question_type, marks, order_number) VALUES (?, ?, ?, ?, ?)',
          [exam2Id, q.text, q.type, q.marks, q.order]
        );
        for (let i = 0; i < q.options.length; i++) {
          await pool.query(
            'INSERT INTO question_options (question_id, option_text, is_correct, order_number) VALUES (?, ?, ?, ?)',
            [qResult.insertId, q.options[i].text, q.options[i].correct, i + 1]
          );
        }
      }
      console.log('✅ Exam 2 (Physics) seeded with questions');
    }

    // Exam 3 - English Essay (Draft)
    const [existingExam3] = await pool.query('SELECT id FROM exams WHERE title = ?', ['English Literature Final Exam']);
    if (existingExam3.length === 0) {
      const [exam3Result] = await pool.query(
        `INSERT INTO exams (title, description, subject_id, teacher_id, duration_minutes, total_marks, pass_marks, start_time, end_time, status, instructions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'English Literature Final Exam',
          'Comprehensive exam on literary analysis',
          subjectList[4].id,
          teachers[2].id,
          90,
          100,
          50,
          null,
          null,
          'draft',
          'Read each passage carefully before answering. Organize your essays with clear introduction, body, and conclusion.'
        ]
      );
      const exam3Id = exam3Result.insertId;

      const engQuestions = [
        {
          text: 'Who wrote "Romeo and Juliet"?',
          type: 'MCQ', marks: 10, order: 1,
          options: [
            { text: 'Charles Dickens', correct: false },
            { text: 'William Shakespeare', correct: true },
            { text: 'Jane Austen', correct: false },
            { text: 'Mark Twain', correct: false },
          ]
        },
        {
          text: 'A sonnet traditionally has 14 lines.',
          type: 'TRUE_FALSE', marks: 10, order: 2,
          options: [
            { text: 'True', correct: true },
            { text: 'False', correct: false },
          ]
        },
        {
          text: 'Define "metaphor" and give an example from a literary work you have studied.',
          type: 'SHORT_ANSWER', marks: 20, order: 3,
          options: []
        },
        {
          text: 'Analyze the theme of ambition in Shakespeare\'s "Macbeth". Discuss how it drives the plot and leads to the protagonist\'s downfall.',
          type: 'ESSAY', marks: 30, order: 4,
          options: []
        },
        {
          text: 'Compare and contrast the narrative techniques used in two novels you have studied this semester.',
          type: 'ESSAY', marks: 30, order: 5,
          options: []
        },
      ];

      for (const q of engQuestions) {
        const [qResult] = await pool.query(
          'INSERT INTO questions (exam_id, question_text, question_type, marks, order_number) VALUES (?, ?, ?, ?, ?)',
          [exam3Id, q.text, q.type, q.marks, q.order]
        );
        for (let i = 0; i < q.options.length; i++) {
          await pool.query(
            'INSERT INTO question_options (question_id, option_text, is_correct, order_number) VALUES (?, ?, ?, ?)',
            [qResult.insertId, q.options[i].text, q.options[i].correct, i + 1]
          );
        }
      }
      console.log('✅ Exam 3 (English) seeded with questions');
    }

    // Update total marks for exams
    await pool.query(
      'UPDATE exams SET total_marks = (SELECT COALESCE(SUM(marks), 0) FROM questions WHERE exam_id = exams.id)'
    );

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Admin:   admin / admin123');
    console.log('   Teacher: sjohnson / teacher123');
    console.log('   Student: athompson / student123');

  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

seed();
