# 📘 Fulbariya College — Admin Manual

**Version:** 2.0
**Last Updated:** September 2026
**Target Audience:** College Admin, Office Staff

---

## 📖 Table of Contents

1. [Admin Login](#1-admin-login)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Student Management](#3-student-management)
4. [Bulk Import (স্মার্ট)](#4-bulk-import-স্মার্ট)
5. [Subject Management](#5-subject-management)
6. [Result Entry (Book-wise)](#6-result-entry-book-wise)
7. [Promote System](#7-promote-system)
8. [Copy / Move Year](#8-copy--move-year)
9. [Result Sheet Verification](#9-result-sheet-verification)
10. [Troubleshooting](#10-troubleshooting)
11. [FAQ](#11-faq)

---

## 1. Admin Login

### 🔐 Login Page

```
URL: https://fulbariya-college.pages.dev/admin-pages/admin-login.html
```

**Credentials:**
- Email: আপনার admin email
- Password: আপনার password

### 🎯 Login Steps

```
১. URL খুলুন
২. Email + Password দিন
৩. [Login] চাপুন
৪. Dashboard-এ redirect হবে
```

**⚠️ Password ভুলে গেলে:**
- "Forgot Password?" link-এ click
- Email-এ reset link যাবে
- নতুন password set করুন

---

## 2. Dashboard Overview

### 📊 Dashboard Cards

Login করার পর আপনি দেখবেন **১৭টি card**:

| # | Card | কাজ |
|---|------|-----|
| 1 | Students | Student Management |
| 2 | Subjects | Subject list |
| 3 | Results | Result Entry |
| 4 | Notices | Notice Management |
| 5 | News | News Management |
| 6 | Gallery | Image Gallery |
| 7 | BNCC | BNCC members |
| 8 | Scouts | Scouts members |
| 9 | Calendar | Academic Calendar |
| 10 | Routine | Class Routine |
| 11 | Exam | Exam Setup |
| 12 | Greeting | Greeting Cards |
| 13 | Department Heads | Dept Heads |
| 14 | Settings | Site Settings |
| 15 | **Promote Students** | Class Promote |
| 16 | **Promotion History** | Promote log |
| 17 | **Promotion Settings** | Rules |

### 🎯 Common Task Shortcuts

```
সবচেয়ে বেশি ব্যবহৃত:
├── 1. Students      → Bulk Import, Edit
├── 3. Results       → Marks Entry
├── 15. Promote      → Class 11 → 12
└── 6. Gallery       → Photo add
```

---

## 3. Student Management

### 🎯 Main Features

```
├── Add Single Student
├── Bulk Import (স্মার্ট)
├── Edit Student
├── Delete Student (Permanent)
├── Deactivate Student
├── View Details
└── Copy / Move Year
```

### 📋 Add Single Student

**কখন ব্যবহার করবেন:**
- ১-২ জন নতুন student যোগ করতে
- Test data দিতে
- Manual entry-র জন্য

**Steps:**

```
১. Admin → Students
২. [Add Student] click
৩. Form পূরণ করুন:
   ├── Name: মোঃ রহিম উদ্দিন
   ├── Roll: 101
   ├── Class: 11
   ├── Year: 2026
   ├── Session: 2026-2027 (auto)
   ├── Branch: HSC
   ├── Group: Science
   └── Subjects: 3 group + 1 optional select
৪. [Save Student] click
```

**⚠️ Session auto-fill:**
- Year select করলে Session auto-generate হয়
- Format: `2026-2027`
- Manual override possible

### 📋 Edit Student

```
১. Student row-এ [Edit] click
২. Form-এ changes করুন
৩. [Update Student]

⚠️ Session field readonly — protect করা
```

### 📋 Deactivate Student

**কখন ব্যবহার:**
- Student পড়া ছেড়ে দিলো
- Data রাখতে চান, কিন্তু list-এ না
- পরে restore করতে পারবেন

```
১. Row-এ [👁] icon click
২. Confirmation → [Yes]
৩. Student list-এ আর দেখাবে না
```

### 📋 Delete Student (Permanent)

**⚠️ চিরতরে মুছে যাবে:**

```
১. Row-এ [🗑] icon click
২. ১ম confirmation
৩. "DELETE" টাইপ করুন
৪. [OK]

⚠️ সব data delete হবে:
   ├── Student info
   ├── Subjects
   ├── Results
   └── Result details
```

---

## 4. Bulk Import (স্মার্ট)

### 🎯 কেন Bulk Import?

**Manual:** 100 students = 3-4 ঘণ্টা
**Bulk Import:** 100 students = 15 মিনিট

**⚡ 90% সময় সাশ্রয়!**

### 📋 Steps

#### Step 1: Common Settings

```
১. Admin → Students
২. [Bulk Import] click
৩. Common settings পূরণ:
   ├── Class: 11
   ├── Year: 2026
   ├── Session: 2026-2027 (auto)
   ├── Branch: HSC
   └── Group: Science
```

#### Step 2: Main Subjects

**Science-এর জন্য:**
```
📌 আবশ্যিক (auto):
✅ পদার্থবিজ্ঞান
✅ রসায়ন

🎯 3rd Main select:
[☑] জীববিজ্ঞান
[☐] উচ্চতর গণিত
```

**Business-এর জন্য:**
```
📌 আবশ্যিক (auto):
✅ হিসাববিজ্ঞান
✅ ব্যবসায় সংগঠন
✅ উৎপাদন ব্যবস্থাপনা
```

**Humanities-এর জন্য:**
```
🎯 ৩টি Main select করুন:
[☑] পৌরনীতি ও সুশাসন
[☑] অর্থনীতি
[☑] যুক্তিবিদ্যা
[☐] ... (আরো)
```

#### Step 3: ৪র্থ Subject (Default)

```
🎯 4th Subject dropdown:
├── উচ্চতর গণিত
├── জীববিজ্ঞান
├── কৃষিশিক্ষা
├── পরিসংখ্যান
└── ...
```

#### Step 4: Student List

**Format 1 — সব same:**
```
101, মোঃ রহিম
102, করিম উদ্দিন
103, সজীব আহমেদ
```

**Format 2 — 4th override:**
```
101, Sabbir
102, Rahim
103, Karim, Biology     ← আলাদা 4th
104, Nasir
```

### 📋 Roll Range Auto-Generate

```
Roll Range:
├── Start: 101
├── End: 150
└── [Generate]

→ 50 roll auto-create হবে
→ পরে নাম edit করতে পারবেন
```

### 📋 Preview

```
১. [Preview] click
২. দেখুন:
   ├── সব student list
   ├── 4th Subject
   ├── Status (OK/Warning/Error)
   └── Conflicts

৩. ঠিক থাকলে [Save All]
```

### 🎯 Duplicate Check

**System auto-check করবে:**
- Internal duplicate (একই paste-এ)
- Database duplicate (already আছে)
- Subject conflict (4th = main)

**⚠️ Warning থাকলে skip হবে, Error থাকলে fix করুন।**

---

## 5. Subject Management

### 🎯 Book-wise View

**নতুন design — book-wise grouped:**

```
📖 পদার্থবিজ্ঞান
├── ১ম পত্র (Code: 174)
│   └── CQ: 50, MCQ: 25, P: 25
├── ২য় পত্র (Code: 175)
│   └── CQ: 50, MCQ: 25, P: 25
└── Total: 200 marks

📖 ICT (Single Paper)
├── Code: 275
└── CQ: 50, MCQ: 25, P: 25
```

### 📋 Filter

```
১. Branch: HSC / BM
২. Class: 11 / 12
৩. Group: Science / Humanities / Business / BM-General
৪. Type: Compulsory / Group / Optional
৫. Search: Book name / code
```

### 📋 Add New Book

```
১. [+ Add New Book] click
২. Form:
   ├── Book Name: পরীক্ষা
   ├── Branch: HSC
   ├── Class: 11
   ├── Group: Science
   ├── Type: Group
   ├── Assessment Model: CQ/MCQ/Practical
   ├── Paper Count: 2
   ├── Paper 1: Code, CQ, MCQ, Practical
   └── Paper 2: Code, CQ, MCQ, Practical
৩. [Save Book]
```

### 📋 Edit Book

```
১. Book card-এ [✏️] click
২. সব papers একসাথে edit
৩. [Update Book]
```

### 📋 Toggle Active

```
১. Book card-এ [👁] click
২. Deactivate → students list-এ দেখাবে না
৩. আবার click → Activate
```

### 📋 Delete Book

```
১. Book card-এ [🗑] click
২. Confirmation
৩. "DELETE" type করুন
৪. [OK]

⚠️ সব related data delete হবে
```

---

## 6. Result Entry (Book-wise)

### 🎯 Design

**Book-wise tabs + Paper-wise input + Live GPA**

### 📋 Steps

#### Step 1: Setup

```
Admin → Results
├── Exam: ফাইনাল পরীক্ষা
├── Class: 11
├── Year: 2026
├── Branch: HSC
├── Group: Science
└── [Load Students]
```

#### Step 2: Book Tabs

```
Subject Tabs দেখাবে:
[বাংলা] [ইংরেজি] [ICT] [পদার্থ] [রসায়ন] [জীব] [গণিত]

প্রতিটা tab-এ status:
✅ সম্পূর্ণ = সব marks দেওয়া
⏳ 10/25 = 10 জন done
— = শুরু হয়নি
```

#### Step 3: Marks Entry

```
📖 পদার্থবিজ্ঞান expand:

▬▬▬ ১ম পত্র (CQ 50 / MCQ 25 / P 25) ▬▬▬

Roll  নাম         CQ   MCQ  P    Total  Grade
101   Sabbir      [50] [25] [25] 100    A+
102   Rahim       [45] [20] [25] 90     A+
103   Karim       [__] [__] [__] —      —

▬▬▬ ২য় পত্র ▬▬▬
...
```

#### Step 4: Auto Features

**⚡ Bulk Fill Buttons:**

```
[সব Practical=25] → এক click-এ সব
[সব MCQ=25]       → এক click-এ সব
[Clear All]        → সব মুছুন
```

**⚡ Auto Tab:**

```
CQ = "50" type → Tab → MCQ
MCQ = "25" type → Tab → Practical
P = "25" type → Tab → Next student
```

**⚡ Live GPA:**

```
User marks দিলেই সাথে সাথে:
├── Total calculate
├── Percentage
├── Grade
└── Row color (green = pass, red = fail)
```

#### Step 5: Progress Bar

```
📊 Progress: [████████░░░░░░] 55%

Details:
├── 25 Students
├── 8 Books
├── 16 Papers
├── 696 Filled
├── 45 Pass ✅
└── 3 Fail ❌
```

#### Step 6: Save / Publish

```
[💾 Save Draft] → পরে continue করা যাবে
[✓ Publish]      → Student-রা দেখতে পাবে
```

**⚠️ Publish enable হবে শুধু 100% complete হলে।**

### 🎯 GPA Calculation (Auto)

```
Per Paper:
├── Total = CQ + MCQ + P
├── Percentage = (Total / Max) × 100
└── Grade Point from table

Per Subject (Book):
├── Average of 2 papers' GP
└── Combined Grade

Overall:
├── Main 6 subjects GPA sum
├── 4th bonus = max(0, 4th GPA - 2.00)
└── Overall = (sum + bonus) / 6
```

**⚠️ সব auto — Admin calculate করবে না।**

### 🎯 BMT Entry

**BMT-তে আলাদা UI:**

```
📖 বাংলা-১
Roll  নাম         Board /60   Continuous /40   Total
101   Sabbir      [50]        [35]             85
102   Rahim       [45]        [30]             75
```

**কোনো CQ/MCQ নেই — শুধু Board + Continuous।**

---

## 7. Promote System

### 🎯 Promote Workflow

```
Class 11 Final Exam → Pass হলে → Class 12-এ Promote
```

### 📋 Steps

#### Step 1: Final Exam Result Entry

```
Admin → Results
├── Exam: ফাইনাল পরীক্ষা
├── Class: 11
├── Year: 2026
├── Branch: HSC
├── Group: Science
├── [Load Students]
├── সব marks দিন
└── [Publish] ← ⚠️ must publish
```

#### Step 2: Promote Page

```
Admin → 15. Promote Students
```

#### Step 3: Source Select

```
📤 Source:
├── Class: 11
├── Year: 2026
├── Branch: HSC
└── [Load Students]

Preview:
├── Total: 50
├── Pass: 45 (auto-checked ✅)
└── Fail: 5 (unchecked)
```

#### Step 4: Target Select

```
📥 Target:
├── Class: 12
├── Year: 2027
└── Session: 2026-2027 ← ⚠️ same (source থেকে)

⚠️ Target-এ already student থাকলে delete হবে
```

#### Step 5: Execute

```
১. "DELETE 2027" type
২. [Execute Promote]
৩. Progress দেখুন
৪. ✅ Success message
```

#### Step 6: Verify

```
Admin → Students
Filter: Class 12 / Year 2027

✅ দেখতে হবে:
├── Promoted students
├── Session: 2026-2027 (same)
└── Class 11-এ fail students

🎯 Session কখনো বদলাবে না।
```

### 🎯 Session Policy (গুরুত্বপূর্ণ)

```
❌ ভুল: Class 11 (2026-27) → Class 12 (2027-28)
✅ সঠিক: Class 11 (2026-27) → Class 12 (2026-27)

কারণ: বাংলাদেশে session = ভর্তির বছর
```

### 🎯 Pass/Fail Rules

```
✅ Pass:
├── সব subject pass
├── কোনো absent নেই
└── GPA ≥ 2.00

❌ Fail:
├── কোনো subject fail
├── কোনো absent
└── GPA < 2.00
```

---

## 8. Copy / Move Year

### 🎯 ৩ Mode

| Mode | Source | Target | ব্যবহার |
|------|--------|--------|---------|
| **Copy** | থাকে | নতুন যোগ | Backup/Test |
| **Move** | delete | নতুন যোগ | Year update |
| **Replace** | delete | পুরোনো delete | Full replace |

### 📋 Steps

```
১. Admin → Students → [Copy / Move Year]
২. Mode select:
   ○ Copy Only
   ○ Move
   ○ Move & Replace
৩. Source: Class 11 / 2024 / HSC
৪. Target: Class 11 / 2025 / HSC
৫. Info দেখুন:
   "5 জন student — 🎓 Session থাকবে: 2024-25"
৬. [Apply]
```

### 🎯 Session Preservation

```
সব mode-এ session source থেকে COPY হয়
কখনো target year থেকে generate হয় না
```

---

## 9. Result Sheet Verification

### 🎯 Student Search

```
URL: results.html

Steps:
১. Roll: 101
২. Class: 11
৩. Year: 2026
৪. Exam: ফাইনাল
৫. Group: Science
৬. [Search]
```

### 🎯 Result Preview

```
✅ Result preview card দেখাবে:
├── Student info
├── GPA
├── Grade
├── Total Marks
└── [View Full Result] button
```

### 🎯 Full Result Sheet

**Book-wise design:**

```
📌 আবশ্যিক বিষয়
📖 বাংলা
├── ১ম পত্র: CQ 70, MCQ 28, Total 98, GP 5.00
├── ২য় পত্র: CQ 88, Total 88, GP 5.00
└── Combined: 186, GP 5.00

📖 ইংরেজি...
📖 ICT...

📚 গ্রুপের বিষয়
📖 পদার্থবিজ্ঞান...

🎯 ৪র্থ বিষয়
📖 উচ্চতর গণিত...
```

### 🎯 GPA Breakdown

```
Result Summary:
├── বাংলা (Combined): 5.00
├── ইংরেজি (Combined): 3.75
├── ICT: 5.00
├── পদার্থ (Combined): 5.00
├── রসায়ন (Combined): 5.00
├── জীব (Combined): 5.00
├── Sum: 28.75
├── 4th Bonus: +3.00
├── Total: 31.75
└── GPA: 31.75 / 6 = 5.29 → 5.00 (capped)

Final: GPA 5.00, Grade A+, Status PASS ✅
```

### 🎯 Actions

```
[📥 Download PDF] → PDF download (print-ready)
[🖨️ Print]       → Browser print
[🔗 Share]        → Link share / Copy
```

---

## 10. Troubleshooting

### ❌ "কোনো student পাওয়া যায়নি"

**কারণ:**
- Roll/Class/Year/Branch/Group ভুল
- Student add করা হয়নি
- Deactivate করা

**সমাধান:**
```
১. Admin → Students → Filter check করুন
২. Info verify করুন
৩. Student add না হলে যোগ করুন
```

### ❌ "Result এখনো publish করা হয়নি"

**কারণ:** Result Draft status-এ আছে

**সমাধান:**
```
Admin → Results → [Publish] click
```

### ❌ "Session বদলে গেছে"

**কারণ:** পুরোনো version

**সমাধান:**
```
১. Hard refresh (Ctrl+Shift+R)
২. Console log check:
   "✅ Session preserved for [name]"
৩. না হলে screenshot নিয়ে report
```

### ❌ "PDF ডাউনলোড হয় না"

**কারণ:** Browser popup block

**সমাধান:**
```
১. Browser popup allow করুন
২. Ad-blocker off করুন
৩. Chrome/Firefox ব্যবহার করুন
```

### ❌ "Duplicate error"

**কারণ:** Same roll + class + year already exists

**সমাধান:**
```
১. Existing list check করুন
২. Roll পরিবর্তন করুন
৩. অথবা existing edit করুন
```

---

## 11. FAQ

### ❓ Promote করার পর board exam fail হলে?

**উত্তর:** Board-এর কাজ। Website-এ track হবে না।

### ❓ Session কী কখনো বদলায়?

**উত্তর:** না। Session = ভর্তির বছর। একবার set হলে কখনো না।

### ❓ ৪র্থ Subject বদলাতে পারব?

**উত্তর:** হ্যাঁ। Student edit করে subject update করা যায়।

### ❓ এক student-কে দুইবার promote করা যাবে?

**উত্তর:** না। Promote-এর পর source delete হয়ে যায়।

### ❓ Restore করা যাবে?

**উত্তর:** হ্যাঁ। Promotion History → [Restore] → সব ফিরে আসবে।

### ❓ 50 জন student যোগ করতে কত সময়?

**উত্তর:**
- Manual: 3-4 ঘণ্টা
- Bulk Import: 15-20 মিনিট

### ❓ Result Entry-তে সব auto হয়?

**উত্তর:** হ্যাঁ। শুধু marks দিন, GPA auto calculate।

### ❓ BMT-র result আলাদা?

**উত্তর:** হ্যাঁ। Board + Continuous format।

---

## 📞 Support

**সমস্যা হলে:**
1. এই guide-এর Troubleshooting দেখুন
2. Console log check (F12)
3. Screenshot + error developer-কে পাঠান

**Contact:** [developer contact]

---

**🎓 Admin Manual Complete**

**শেষ আপডেট:** September 2026