# 🎓 Smart SMS - School Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/Tests-459_passing-brightgreen.svg)](#-testing)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-brightgreen.svg)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)

**Smart SMS** is a complete School Management System with role-based access control for Admin, Teacher, Student, and Parent portals. Built with **React**, **Node.js**, **Express**, and **MongoDB**.

---

## ✨ Features

### 🔐 Four Role-Based Portals

#### 👨‍💼 Admin Portal
- Complete user management (Students, Teachers, Parents)
- Teacher-to-class and teacher-to-subject assignments
- View all attendance and grades
- Academic year and term management
- Enrollment, promotion, and transfer workflows
- Create announcements
- System analytics and reports

#### 👨‍🏫 Teacher Portal
- View assigned students only
- Mark and manage attendance
- Add and edit grades (quiz, assignment, classwork)
- Create and manage assignments
- Grade student submissions

#### 👨‍🎓 Student Portal
- View own profile and academic records
- Check attendance history with statistics
- View grades and results
- Submit assignments
- View class timetable
- View enrollment history

#### 👨‍👩‍👧‍👦 Parent Portal
- Monitor linked children
- Switch between multiple children
- View attendance records
- Check grades and progress
- View enrollment history per child

### 🌟 Key Capabilities

- ✅ **ONE Unified System** - All portals use the same database
- ✅ **Real-Time Sync** - Changes reflect immediately across all portals
- ✅ **Secure Authentication** - JWT-based with role validation
- ✅ **Relationship-Based Access** - Teachers see only assigned students
- ✅ **Parent-Child Isolation** - Parents see only linked children
- ✅ **Bilingual Support** - English and Amharic (አማርኛ)
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Dark Mode** - Persistent theme across all portals
- ✅ **Notification System** - Real-time notifications with 30s polling
- ✅ **Comprehensive Tests** - 459 passing tests across 12 test files

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v4.4 or higher) - Local or MongoDB Atlas
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/ERMIYASZEWDU/smart-sms-school-management.git
cd smart-sms-school-management

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ..
npm install
```

### Configuration

```bash
# Create backend environment file
cd server
cp .env.example .env

# Edit .env and update:
# - MONGODB_URI (your MongoDB connection string)
# - JWT_SECRET (a strong random key)
# - PORT (default: 5000)
```

### Database Setup

```bash
# Run the seed script to create initial data
cd server
npm run seed
```

This creates:
- 1 Admin account
- 2 Teacher accounts (with class assignments)
- 5 Student accounts
- 2 Parent accounts (linked to students)
- Classes, subjects, and academic year data

### Start the Application

**Option 1: Using the start script (Windows)**
```powershell
.\start.ps1
```

**Option 2: Manual start (2 terminals)**

Terminal 1 - Backend:
```bash
cd server
npm start
```

Terminal 2 - Frontend:
```bash
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@smartsms.et` | `Admin@123` |
| Teacher | `teacher1@smartsms.et` | `Teacher@123` |
| Student | `student1@smartsms.et` | `Student@123` |
| Parent | `parent1@smartsms.et` | `Parent@123` |

---

## 🏗️ Architecture

```
                    SMART SMS
                        |
                     LOGIN (JWT)
                        |
                  Role Detection
                        |
        +---------------+---------------+
        |               |               |
      ADMIN          TEACHER         STUDENT
        |               |               |
        +---------------+---------------+
                        |
                      PARENT
                        |
                    API Layer
                        |
                     MongoDB
```

**Key Principle**: All roles use the SAME database with role-based filtering.

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Navigation
- **Axios** - HTTP client
- **React i18next** - Internationalization (English + Amharic)
- **Recharts** - Data visualization
- **Zustand** - State management

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Nodemailer** - Email notifications

### Testing
- **Node.js test runner** - Built-in test framework
- **Supertest** - HTTP assertion library
- **MongoDB Memory Server** - In-memory test database

---

## 📁 Project Structure

```
smart-sms-school-management/
├── server/                     # Backend (Express + MongoDB)
│   ├── models/                # Database models
│   │   ├── User.js           # Authentication
│   │   ├── Student.js        # Student profiles
│   │   ├── Teacher.js        # Teacher profiles
│   │   ├── Parent.js         # Parent profiles
│   │   ├── Class.js          # Classes
│   │   ├── Subject.js        # Subjects
│   │   ├── Grade.js          # Grades/Results
│   │   ├── Attendance.js     # Attendance records
│   │   ├── Assignment.js     # Assignments
│   │   ├── Announcement.js   # Announcements
│   │   ├── AcademicYear.js   # Academic years
│   │   ├── Term.js           # Terms within academic years
│   │   ├── Enrollment.js     # Student enrollment records
│   │   ├── Notification.js   # User notifications
│   │   └── AuditLog.js       # Audit trail
│   ├── routes/               # API endpoints
│   │   ├── auth.js           # Authentication
│   │   ├── admin.js          # Admin APIs
│   │   ├── teacher.js        # Teacher APIs
│   │   ├── student.js        # Student APIs
│   │   ├── parent.js         # Parent APIs
│   │   ├── enrollment.js     # Enrollment CRUD
│   │   ├── academicYear.js   # Academic year management
│   │   ├── term.js           # Term management
│   │   ├── announcements.js  # Announcements
│   │   └── notification.js   # Notifications
│   ├── middleware/            # Auth & rate limiting
│   ├── services/             # Business logic
│   ├── utils/                # Helpers
│   ├── test/                 # Test suite (459 tests)
│   │   ├── setup.js          # Test utilities & factories
│   │   ├── auth.test.js
│   │   ├── adminCrud.test.js
│   │   ├── teacherGradeAttendance.test.js
│   │   ├── teacherAssignment.test.js
│   │   ├── notificationApi.test.js
│   │   ├── notificationService.test.js
│   │   ├── academicYear.test.js
│   │   ├── term.test.js
│   │   ├── enrollment.test.js
│   │   ├── studentRoutes.test.js
│   │   ├── parentRoutes.test.js
│   │   └── crossRoleIsolation.test.js
│   ├── seed.js               # Database seeding
│   └── index.js              # Server entry point
│
├── src/                       # Frontend (React + Vite)
│   ├── pages/
│   │   ├── dashboards/       # Role dashboards
│   │   ├── AdminPages/       # Admin pages
│   │   ├── TeacherPages/     # Teacher pages
│   │   ├── StudentPages/     # Student pages
│   │   └── ParentPages/      # Parent pages
│   ├── services/             # API services
│   ├── components/           # Reusable components
│   ├── store/                # Zustand state stores
│   ├── i18n/                 # Translations (en, am)
│   └── utils/                # Utility functions
│
└── README.md                 # This file
```

---

## 🔒 Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Password Hashing** - Bcrypt encryption
- ✅ **Role-Based Access Control** - Backend validation on every route
- ✅ **Relationship Verification** - Teachers access only assigned students
- ✅ **Parent-Child Linking** - Parents see only linked children
- ✅ **Cross-Role Isolation** - Admin cannot access student/parent dashboards and vice versa
- ✅ **Rate Limiting** - Brute force protection (5 attempts/15min)
- ✅ **Helmet Security Headers** - XSS, clickjacking protection
- ✅ **CORS Protection** - Origin validation
- ✅ **Input Validation** - Comprehensive backend validation
- ✅ **Audit Logging** - Track all critical actions
- ✅ **No Password Exposure** - Never returned in API responses

---

## 🌍 Internationalization

Supports **English** and **Amharic (አማርኛ)** with:
- Complete UI translation for all portals
- Persistent language selection (stored in localStorage)
- Cultural considerations for Ethiopian schools

---

## 🧪 Testing

The project has **459 tests** across **12 test files** with **123 test suites**, all using an in-memory MongoDB for fast, isolated execution.

### Run Tests

```bash
cd server
npm test
```

### Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `adminCrud.test.js` | 58 | User CRUD, student/teacher/parent management |
| `auth.test.js` | 30 | Login, register, password reset, OTP flow |
| `notificationApi.test.js` | 25 | Notification CRUD, mark read, delete |
| `notificationService.test.js` | 27 | Grade, attendance, assignment, enrollment notifications |
| `teacherGradeAttendance.test.js` | 36 | Grade/attendance CRUD, cross-teacher isolation |
| `teacherAssignment.test.js` | 25 | Assignment CRUD, class listing, ownership isolation |
| `academicYear.test.js` | 30 | RBAC, CRUD, activate/deactivate, archive/unarchive |
| `term.test.js` | 26 | Term CRUD, toggle-active, cascading deactivation |
| `enrollment.test.js` | 45 | Enroll, promote, transfer, status, history, parent isolation |
| `studentRoutes.test.js` | 59 | Dashboard, profile, grades, attendance, enrollment |
| `parentRoutes.test.js` | 27 | Dashboard, children, announcements, enrollment isolation |
| `crossRoleIsolation.test.js` | 71 | All roles blocked from other roles' endpoints |
| **Total** | **459** | |

---

## 🚀 Deployment

### Backend (Render)

1. Push to GitHub
2. Connect repository to Render
3. Set environment variables:
   - `MONGODB_URI` (MongoDB Atlas connection string)
   - `JWT_SECRET` (strong random key)
   - `PORT` (optional, defaults to 5000)

### Frontend (Vercel)

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Set environment variable:
   - `VITE_API_URL` (your backend URL)

---

## 📊 Key Features Highlight

### Teacher-Student Relationship
- Teachers see only their assigned students
- Grade dropdown populated with correct students
- Proper class-based filtering

### Enrollment System
- Enroll students in classes per academic year
- Promote students to next grade
- Transfer students between classes
- Track enrollment history with status workflow

### Data Synchronization
- **Real-Time Updates**: Changes reflect across all portals immediately
- **Single Source of Truth**: All roles use the same database
- **No Duplicate Data**: One attendance record, one grade record

---


## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👨‍💻 Author

**Ermiyas Zewdu**
- GitHub: [@ERMIYASZEWDU](https://github.com/ERMIYASZEWDU)

---

## 🙏 Acknowledgments

- Ethiopian Education System for inspiration
- All contributors and testers
- Open source community

---

**⭐ If you find this project helpful, please give it a star!**

**🚀 Ready to revolutionize school management in Ethiopia!**
