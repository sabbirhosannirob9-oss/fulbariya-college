-- ============================================================
-- FULBARIYA COLLEGE — RESULT SYSTEM
-- Complete Database Schema (v5.0 — FINAL)
-- Branch: HSC (Science/Humanities/Business) + BM (BMT)
-- Last Updated: 2026
-- ============================================================

-- ⚠️⚠️⚠️  WARNING  ⚠️⚠️⚠️
-- ============================================================
-- এই ফাইলটি চালালে শুধু এই ৫টি table DROP হবে:
--   • result_details
--   • results
--   • student_subjects
--   • subjects
--   • students
--
-- নিচের table-গুলো SAFE — কোনো পরিবর্তন হবে না:
--   • admins
--   • notices
--   • news
--   • gallery
--   • bncc_members
--   • scouts_members
--   • department_heads
--   • site_settings
--   • student_login
--
-- Production DB-তে চালানোর আগে অবশ্যই Backup নিন!
-- ============================================================

-- ============================================================
-- STEP 1: শুধু Result System-এর ৫টি table DROP
-- ============================================================

DROP TABLE IF EXISTS result_details      CASCADE;
DROP TABLE IF EXISTS results             CASCADE;
DROP TABLE IF EXISTS student_subjects    CASCADE;
DROP TABLE IF EXISTS subjects            CASCADE;
DROP TABLE IF EXISTS students            CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================
-- STEP 2: Utility Function — updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 3: Master Tables
-- ============================================================

-- 3.1 classes
CREATE TABLE classes (
  id            BIGSERIAL PRIMARY KEY,
  class_name    TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 groups
CREATE TABLE groups (
  id            BIGSERIAL PRIMARY KEY,
  group_name    TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  branch        TEXT NOT NULL CHECK (branch IN ('HSC','BM')),
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_name, branch)
);

-- 3.3 exams
CREATE TABLE exams (
  id            BIGSERIAL PRIMARY KEY,
  exam_name     TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  exam_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 subjects
CREATE TABLE subjects (
  id                BIGSERIAL PRIMARY KEY,
  subject_name      TEXT NOT NULL,
  subject_code      TEXT,
  subject_type      TEXT NOT NULL
                    CHECK (subject_type IN ('compulsory','group','optional')),
  branch            TEXT NOT NULL CHECK (branch IN ('HSC','BM')),
  group_name        TEXT,
  class_name        TEXT NOT NULL,
  paper_number      INT DEFAULT 1 CHECK (paper_number IN (1,2)),
  has_cq            BOOLEAN DEFAULT FALSE,
  has_mcq           BOOLEAN DEFAULT FALSE,
  has_practical     BOOLEAN DEFAULT FALSE,
  cq_marks          INT DEFAULT 0,
  mcq_marks         INT DEFAULT 0,
  practical_marks   INT DEFAULT 0,
  full_marks        INT GENERATED ALWAYS AS
                    (COALESCE(cq_marks,0)+COALESCE(mcq_marks,0)+COALESCE(practical_marks,0)) STORED,
  is_group          BOOLEAN DEFAULT FALSE,
  is_optional       BOOLEAN DEFAULT FALSE,
  is_only_optional  BOOLEAN DEFAULT FALSE,
  sort_order        INT DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_name, class_name, branch, paper_number, group_name)
);

-- ============================================================
-- STEP 4: Main Tables
-- ============================================================

-- 4.1 students
CREATE TABLE students (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  roll            TEXT NOT NULL,
  class_name      TEXT NOT NULL,
  year            TEXT NOT NULL,
  session         TEXT NOT NULL,
  branch          TEXT NOT NULL CHECK (branch IN ('HSC','BM')),
  group_name      TEXT,
  trade_subject   TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(roll, class_name, year, session, branch, group_name)
);

CREATE TRIGGER trg_students_updated
BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.2 student_subjects
CREATE TABLE student_subjects (
  id              BIGSERIAL PRIMARY KEY,
  student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id      BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  subject_type    TEXT NOT NULL CHECK (subject_type IN ('compulsory','group','optional')),
  is_active       BOOLEAN DEFAULT TRUE,
  selected_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);

-- 4.3 results
CREATE TABLE results (
  id              BIGSERIAL PRIMARY KEY,
  student_id      BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id         BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  year            TEXT NOT NULL,
  session         TEXT NOT NULL,
  branch          TEXT NOT NULL CHECK (branch IN ('HSC','BM')),
  gpa             NUMERIC(3,2) DEFAULT 0.00,
  grade           TEXT,
  total_marks     INT DEFAULT 0,
  position        INT,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','published')),
  is_published    BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  published_by    UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, exam_id, year, session)
);

CREATE TRIGGER trg_results_updated
BEFORE UPDATE ON results
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.4 result_details
CREATE TABLE result_details (
  id                BIGSERIAL PRIMARY KEY,
  result_id         BIGINT NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  student_id        BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id        BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_id           BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_type      TEXT NOT NULL,
  paper_number      INT DEFAULT 1,
  cq_marks          NUMERIC(5,2) DEFAULT 0,
  mcq_marks         NUMERIC(5,2) DEFAULT 0,
  practical_marks   NUMERIC(5,2) DEFAULT 0,
  total_marks       NUMERIC(5,2) DEFAULT 0,
  grade             TEXT,
  grade_point       NUMERIC(3,2) DEFAULT 0,
  status            TEXT DEFAULT 'pass' CHECK (status IN ('pass','fail','absent')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(result_id, subject_id)
);

CREATE TRIGGER trg_result_details_updated
BEFORE UPDATE ON result_details
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.5 result_audit_log
CREATE TABLE result_audit_log (
  id              BIGSERIAL PRIMARY KEY,
  table_name      TEXT NOT NULL,
  record_id       BIGINT NOT NULL,
  action          TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE','PUBLISH')),
  changed_by      UUID,
  old_data        JSONB,
  new_data        JSONB,
  changed_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 5: Indexes
-- ============================================================

CREATE INDEX idx_students_roll         ON students(roll);
CREATE INDEX idx_students_class_year   ON students(class_name, year, branch);
CREATE INDEX idx_students_session      ON students(session);
CREATE INDEX idx_students_group        ON students(group_name);
CREATE INDEX idx_students_active       ON students(is_active);

CREATE INDEX idx_subjects_class        ON subjects(class_name, branch);
CREATE INDEX idx_subjects_group        ON subjects(group_name);
CREATE INDEX idx_subjects_type         ON subjects(subject_type);
CREATE INDEX idx_subjects_active       ON subjects(is_active);

CREATE INDEX idx_stu_sub_student       ON student_subjects(student_id);
CREATE INDEX idx_stu_sub_subject       ON student_subjects(subject_id);

CREATE INDEX idx_results_student       ON results(student_id);
CREATE INDEX idx_results_exam          ON results(exam_id, year);
CREATE INDEX idx_results_published     ON results(is_published);

CREATE INDEX idx_res_det_result        ON result_details(result_id);
CREATE INDEX idx_res_det_student       ON result_details(student_id);

CREATE INDEX idx_audit_record          ON result_audit_log(table_name, record_id);
CREATE INDEX idx_audit_changed_at      ON result_audit_log(changed_at DESC);

-- ============================================================
-- STEP 6: RLS Policies (DELETE block সহ)
-- ============================================================

ALTER TABLE classes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE results           ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_details    ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_audit_log  ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "public_read_classes"  ON classes  FOR SELECT USING (TRUE);
CREATE POLICY "public_read_groups"   ON groups   FOR SELECT USING (TRUE);
CREATE POLICY "public_read_exams"    ON exams    FOR SELECT USING (TRUE);
CREATE POLICY "public_read_subjects" ON subjects FOR SELECT USING (TRUE);

CREATE POLICY "public_read_published_results"
  ON results FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "public_read_result_details"
  ON result_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM results r
      WHERE r.id = result_details.result_id
      AND r.is_published = TRUE
    )
  );

-- Service role: SELECT, INSERT, UPDATE — DELETE নেই ❌
CREATE POLICY "service_select_classes"  ON classes  FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "service_insert_classes"  ON classes  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_update_classes"  ON classes  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "service_select_groups"   ON groups   FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "service_insert_groups"   ON groups   FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_update_groups"   ON groups   FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "service_select_exams"    ON exams    FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "service_insert_exams"    ON exams    FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_update_exams"    ON exams    FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "service_select_subjects" ON subjects FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "service_insert_subjects" ON subjects FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_update_subjects" ON subjects FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "service_select_students" ON students FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "service_insert_students" ON students FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_update_students" ON students FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "service_select_stu_sub"  ON student_subjects FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "service_insert_stu_sub"  ON student_subjects FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_update_stu_sub"  ON student_subjects FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "service_delete_stu_sub"  ON student_subjects FOR DELETE USING (auth.role() = 'service_role');

CREATE POLICY "service_select_results"  ON results  FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "service_insert_results"  ON results  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_update_results"  ON results  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "service_select_res_det"  ON result_details FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "service_insert_res_det"  ON result_details FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_update_res_det"  ON result_details FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "service_select_audit"    ON result_audit_log FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "service_insert_audit"    ON result_audit_log FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- STEP 7: Master Data
-- ============================================================

INSERT INTO classes (class_name, display_name, sort_order) VALUES
  ('11', 'একাদশ শ্রেণি', 1),
  ('12', 'দ্বাদশ শ্রেণি', 2);

INSERT INTO groups (group_name, display_name, branch, sort_order) VALUES
  ('Science',    'বিজ্ঞান',        'HSC', 1),
  ('Humanities', 'মানবিক',          'HSC', 2),
  ('Business',   'ব্যবসায় শিক্ষা', 'HSC', 3),
  ('BM-General', 'বিএম (সাধারণ)',  'BM',  1);

INSERT INTO exams (exam_name, display_name, exam_order) VALUES
  ('1st Terminal', 'প্রথম সাময়িক',   1),
  ('2nd Terminal', 'দ্বিতীয় সাময়িক', 2),
  ('Test',         'টেস্ট পরীক্ষা',    3),
  ('Final',        'ফাইনাল পরীক্ষা',   4);

-- ============================================================
-- STEP 8: HSC COMPULSORY (Class 11 + 12)
-- ============================================================

INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, class_name, paper_number,
   has_cq, has_mcq, cq_marks, mcq_marks, is_group, is_optional, sort_order)
VALUES
  ('বাংলা',   '101', 'compulsory', 'HSC', '11', 1, TRUE, TRUE, 70, 30, FALSE, FALSE, 1),
  ('বাংলা',   '102', 'compulsory', 'HSC', '11', 2, TRUE, FALSE, 100, 0, FALSE, FALSE, 2),
  ('English', '107', 'compulsory', 'HSC', '11', 1, TRUE, FALSE, 100, 0, FALSE, FALSE, 3),
  ('English', '108', 'compulsory', 'HSC', '11', 2, TRUE, FALSE, 100, 0, FALSE, FALSE, 4),
  ('ICT',     '275', 'compulsory', 'HSC', '11', 1, TRUE, TRUE, 50, 25, FALSE, FALSE, 5);

INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, class_name, paper_number,
   has_cq, has_mcq, cq_marks, mcq_marks, is_group, is_optional, sort_order)
VALUES
  ('বাংলা',   '101', 'compulsory', 'HSC', '12', 1, TRUE, TRUE, 70, 30, FALSE, FALSE, 1),
  ('বাংলা',   '102', 'compulsory', 'HSC', '12', 2, TRUE, FALSE, 100, 0, FALSE, FALSE, 2),
  ('English', '107', 'compulsory', 'HSC', '12', 1, TRUE, FALSE, 100, 0, FALSE, FALSE, 3),
  ('English', '108', 'compulsory', 'HSC', '12', 2, TRUE, FALSE, 100, 0, FALSE, FALSE, 4),
  ('ICT',     '275', 'compulsory', 'HSC', '12', 1, TRUE, TRUE, 50, 25, FALSE, FALSE, 5);

-- ============================================================
-- STEP 9: HSC — SCIENCE GROUP (Group Subjects)
-- ============================================================

-- Class 11
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, sort_order)
VALUES
  ('পদার্থবিজ্ঞান', '174', 'group', 'HSC', 'Science', '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 100),
  ('পদার্থবিজ্ঞান', '175', 'group', 'HSC', 'Science', '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 101),
  ('রসায়ন',        '176', 'group', 'HSC', 'Science', '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 110),
  ('রসায়ন',        '177', 'group', 'HSC', 'Science', '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 111),
  ('জীববিজ্ঞান',    '178', 'group', 'HSC', 'Science', '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 120),
  ('জীববিজ্ঞান',    '179', 'group', 'HSC', 'Science', '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 121),
  ('উচ্চতর গণিত',   '265', 'group', 'HSC', 'Science', '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 130),
  ('উচ্চতর গণিত',   '266', 'group', 'HSC', 'Science', '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 131);

-- Class 12
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, sort_order)
VALUES
  ('পদার্থবিজ্ঞান', '174', 'group', 'HSC', 'Science', '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 100),
  ('পদার্থবিজ্ঞান', '175', 'group', 'HSC', 'Science', '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 101),
  ('রসায়ন',        '176', 'group', 'HSC', 'Science', '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 110),
  ('রসায়ন',        '177', 'group', 'HSC', 'Science', '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 111),
  ('জীববিজ্ঞান',    '178', 'group', 'HSC', 'Science', '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 120),
  ('জীববিজ্ঞান',    '179', 'group', 'HSC', 'Science', '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 121),
  ('উচ্চতর গণিত',   '265', 'group', 'HSC', 'Science', '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 130),
  ('উচ্চতর গণিত',   '266', 'group', 'HSC', 'Science', '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 131);

-- ============================================================
-- STEP 10: HSC — SCIENCE GROUP (Optional Subjects)
-- Biology, Higher Math, Agriculture, Psychology, Eng.Draw, Geography, Statistics
-- ============================================================

INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, is_only_optional, sort_order)
VALUES
  ('জীববিজ্ঞান',    '178', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 200),
  ('জীববিজ্ঞান',    '179', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 201),
  ('উচ্চতর গণিত',   '265', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 202),
  ('উচ্চতর গণিত',   '266', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 203),
  ('কৃষিশিক্ষা',    '239', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  204),
  ('কৃষিশিক্ষা',    '240', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  205),
  ('মনোবিজ্ঞান',    '123', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 206),
  ('মনোবিজ্ঞান',    '124', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 207),
  ('প্রকৌশল অঙ্কন ও ওয়ার্কশপ প্র্যাকটিস', '180', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 208),
  ('প্রকৌশল অঙ্কন ও ওয়ার্কশপ প্র্যাকটিস', '222', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 209),
  ('ভূগোল',         '125', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 210),
  ('ভূগোল',         '126', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 211),
  ('পরিসংখ্যান',    '129', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 212),
  ('পরিসংখ্যান',    '130', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 213);

-- Class 12
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, is_only_optional, sort_order)
VALUES
  ('জীববিজ্ঞান',    '178', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 200),
  ('জীববিজ্ঞান',    '179', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 201),
  ('উচ্চতর গণিত',   '265', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 202),
  ('উচ্চতর গণিত',   '266', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 203),
  ('কৃষিশিক্ষা',    '239', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  204),
  ('কৃষিশিক্ষা',    '240', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  205),
  ('মনোবিজ্ঞান',    '123', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 206),
  ('মনোবিজ্ঞান',    '124', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 207),
  ('প্রকৌশল অঙ্কন ও ওয়ার্কশপ প্র্যাকটিস', '180', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 208),
  ('প্রকৌশল অঙ্কন ও ওয়ার্কশপ প্র্যাকটিস', '222', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 209),
  ('ভূগোল',         '125', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 210),
  ('ভূগোল',         '126', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 211),
  ('পরিসংখ্যান',    '129', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 212),
  ('পরিসংখ্যান',    '130', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 213);

-- ============================================================
-- STEP 11: HSC — BUSINESS GROUP (Group Subjects)
-- Accounting, Business Org, Production, Finance, Statistics, Economics, Geography, Agriculture
-- ============================================================

-- Class 11
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, sort_order)
VALUES
  ('হিসাববিজ্ঞান',                 '253', 'group', 'HSC', 'Business', '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 300),
  ('হিসাববিজ্ঞান',                 '254', 'group', 'HSC', 'Business', '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 301),
  ('ব্যবসায় সংগঠন ও ব্যবস্থাপনা', '277', 'group', 'HSC', 'Business', '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 310),
  ('ব্যবসায় সংগঠন ও ব্যবস্থাপনা', '278', 'group', 'HSC', 'Business', '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 311),
  ('উৎপাদন ব্যবস্থাপনা ও বিপণন',  '286', 'group', 'HSC', 'Business', '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 320),
  ('উৎপাদন ব্যবস্থাপনা ও বিপণন',  '287', 'group', 'HSC', 'Business', '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 321),
  ('ফিন্যান্স, ব্যাংকিং ও বিমা',   '292', 'group', 'HSC', 'Business', '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 330),
  ('ফিন্যান্স, ব্যাংকিং ও বিমা',   '293', 'group', 'HSC', 'Business', '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 331),
  ('পরিসংখ্যান',                   '129', 'group', 'HSC', 'Business', '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 340),
  ('পরিসংখ্যান',                   '130', 'group', 'HSC', 'Business', '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 341),
  ('অর্থনীতি',                     '109', 'group', 'HSC', 'Business', '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 350),
  ('অর্থনীতি',                     '110', 'group', 'HSC', 'Business', '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 351),
  ('ভূগোল',                        '125', 'group', 'HSC', 'Business', '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 360),
  ('ভূগোল',                        '126', 'group', 'HSC', 'Business', '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 361),
  ('কৃষিশিক্ষা',                   '239', 'group', 'HSC', 'Business', '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 370),
  ('কৃষিশিক্ষা',                   '240', 'group', 'HSC', 'Business', '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 371);

-- Class 12
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, sort_order)
VALUES
  ('হিসাববিজ্ঞান',                 '253', 'group', 'HSC', 'Business', '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 300),
  ('হিসাববিজ্ঞান',                 '254', 'group', 'HSC', 'Business', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 301),
  ('ব্যবসায় সংগঠন ও ব্যবস্থাপনা', '277', 'group', 'HSC', 'Business', '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 310),
  ('ব্যবসায় সংগঠন ও ব্যবস্থাপনা', '278', 'group', 'HSC', 'Business', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 311),
  ('উৎপাদন ব্যবস্থাপনা ও বিপণন',  '286', 'group', 'HSC', 'Business', '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 320),
  ('উৎপাদন ব্যবস্থাপনা ও বিপণন',  '287', 'group', 'HSC', 'Business', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 321),
  ('ফিন্যান্স, ব্যাংকিং ও বিমা',   '292', 'group', 'HSC', 'Business', '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 330),
  ('ফিন্যান্স, ব্যাংকিং ও বিমা',   '293', 'group', 'HSC', 'Business', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 331),
  ('পরিসংখ্যান',                   '129', 'group', 'HSC', 'Business', '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 340),
  ('পরিসংখ্যান',                   '130', 'group', 'HSC', 'Business', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 341),
  ('অর্থনীতি',                     '109', 'group', 'HSC', 'Business', '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 350),
  ('অর্থনীতি',                     '110', 'group', 'HSC', 'Business', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, TRUE, FALSE, 351),
  ('ভূগোল',                        '125', 'group', 'HSC', 'Business', '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 360),
  ('ভূগোল',                        '126', 'group', 'HSC', 'Business', '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 361),
  ('কৃষিশিক্ষা',                   '239', 'group', 'HSC', 'Business', '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 370),
  ('কৃষিশিক্ষা',                   '240', 'group', 'HSC', 'Business', '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 371);

-- ============================================================
-- STEP 12: HSC — BUSINESS GROUP (Optional Subjects)
-- Finance, Production, Statistics, Economics, Geography, Agriculture
-- ============================================================

-- Class 11
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, is_only_optional, sort_order)
VALUES
  ('ফিন্যান্স, ব্যাংকিং ও বিমা',   '292', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 400),
  ('ফিন্যান্স, ব্যাংকিং ও বিমা',   '293', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 401),
  ('উৎপাদন ব্যবস্থাপনা ও বিপণন',  '286', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 402),
  ('উৎপাদন ব্যবস্থাপনা ও বিপণন',  '287', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 403),
  ('পরিসংখ্যান',                   '129', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 404),
  ('পরিসংখ্যান',                   '130', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 405),
  ('অর্থনীতি',                     '109', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 406),
  ('অর্থনীতি',                     '110', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 407),
  ('ভূগোল',                        '125', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 408),
  ('ভূগোল',                        '126', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 409),
  ('কৃষিশিক্ষা',                   '239', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  410),
  ('কৃষিশিক্ষা',                   '240', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  411);

-- Class 12
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, is_only_optional, sort_order)
VALUES
  ('ফিন্যান্স, ব্যাংকিং ও বিমা',   '292', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 400),
  ('ফিন্যান্স, ব্যাংকিং ও বিমা',   '293', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 401),
  ('উৎপাদন ব্যবস্থাপনা ও বিপণন',  '286', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 402),
  ('উৎপাদন ব্যবস্থাপনা ও বিপণন',  '287', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 403),
  ('পরিসংখ্যান',                   '129', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 404),
  ('পরিসংখ্যান',                   '130', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 405),
  ('অর্থনীতি',                     '109', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 406),
  ('অর্থনীতি',                     '110', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 407),
  ('ভূগোল',                        '125', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 408),
  ('ভূগোল',                        '126', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 409),
  ('কৃষিশিক্ষা',                   '239', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  410),
  ('কৃষিশিক্ষা',                   '240', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  411);

-- ============================================================
-- STEP 13: HSC — HUMANITIES GROUP (Group Subjects)
-- Civics, Social Work, History, Sociology, Economics
-- ============================================================

-- Class 11
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, cq_marks, mcq_marks, is_group, is_optional, sort_order)
VALUES
  ('পৌরনীতি ও সুশাসন', '269', 'group', 'HSC', 'Humanities', '11', 1, TRUE, TRUE, 70, 30, TRUE, FALSE, 500),
  ('পৌরনীতি ও সুশাসন', '270', 'group', 'HSC', 'Humanities', '11', 2, TRUE, TRUE, 70, 30, TRUE, FALSE, 501),
  ('সমাজকর্ম',          '271', 'group', 'HSC', 'Humanities', '11', 1, TRUE, TRUE, 70, 30, TRUE, FALSE, 510),
  ('সমাজকর্ম',          '272', 'group', 'HSC', 'Humanities', '11', 2, TRUE, TRUE, 70, 30, TRUE, FALSE, 511),
  ('ইতিহাস',            '304', 'group', 'HSC', 'Humanities', '11', 1, TRUE, TRUE, 70, 30, TRUE, FALSE, 520),
  ('ইতিহাস',            '305', 'group', 'HSC', 'Humanities', '11', 2, TRUE, TRUE, 70, 30, TRUE, FALSE, 521),
  ('সমাজবিজ্ঞান',       '117', 'group', 'HSC', 'Humanities', '11', 1, TRUE, TRUE, 70, 30, TRUE, FALSE, 530),
  ('সমাজবিজ্ঞান',       '118', 'group', 'HSC', 'Humanities', '11', 2, TRUE, TRUE, 70, 30, TRUE, FALSE, 531),
  ('অর্থনীতি',          '109', 'group', 'HSC', 'Humanities', '11', 1, TRUE, TRUE, 70, 30, TRUE, FALSE, 540),
  ('অর্থনীতি',          '110', 'group', 'HSC', 'Humanities', '11', 2, TRUE, TRUE, 70, 30, TRUE, FALSE, 541);

-- Class 12
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, cq_marks, mcq_marks, is_group, is_optional, sort_order)
VALUES
  ('পৌরনীতি ও সুশাসন', '269', 'group', 'HSC', 'Humanities', '12', 1, TRUE, TRUE, 70, 30, TRUE, FALSE, 500),
  ('পৌরনীতি ও সুশাসন', '270', 'group', 'HSC', 'Humanities', '12', 2, TRUE, TRUE, 70, 30, TRUE, FALSE, 501),
  ('সমাজকর্ম',          '271', 'group', 'HSC', 'Humanities', '12', 1, TRUE, TRUE, 70, 30, TRUE, FALSE, 510),
  ('সমাজকর্ম',          '272', 'group', 'HSC', 'Humanities', '12', 2, TRUE, TRUE, 70, 30, TRUE, FALSE, 511),
  ('ইতিহাস',            '304', 'group', 'HSC', 'Humanities', '12', 1, TRUE, TRUE, 70, 30, TRUE, FALSE, 520),
  ('ইতিহাস',            '305', 'group', 'HSC', 'Humanities', '12', 2, TRUE, TRUE, 70, 30, TRUE, FALSE, 521),
  ('সমাজবিজ্ঞান',       '117', 'group', 'HSC', 'Humanities', '12', 1, TRUE, TRUE, 70, 30, TRUE, FALSE, 530),
  ('সমাজবিজ্ঞান',       '118', 'group', 'HSC', 'Humanities', '12', 2, TRUE, TRUE, 70, 30, TRUE, FALSE, 531),
  ('অর্থনীতি',          '109', 'group', 'HSC', 'Humanities', '12', 1, TRUE, TRUE, 70, 30, TRUE, FALSE, 540),
  ('অর্থনীতি',          '110', 'group', 'HSC', 'Humanities', '12', 2, TRUE, TRUE, 70, 30, TRUE, FALSE, 541);

-- ============================================================
-- STEP 14: HSC — HUMANITIES GROUP (Optional Subjects)
-- Civics, History, Islamic History, Economics, Geography, Statistics, Logic, Social Work, Sociology, Agriculture
-- ============================================================

-- Class 11
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, is_only_optional, sort_order)
VALUES
  ('পৌরনীতি ও সুশাসন',           '269', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 600),
  ('পৌরনীতি ও সুশাসন',           '270', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 601),
  ('ইতিহাস',                      '304', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 602),
  ('ইতিহাস',                      '305', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 603),
  ('ইসলামের ইতিহাস ও সংস্কৃতি', '267', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 604),
  ('ইসলামের ইতিহাস ও সংস্কৃতি', '268', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 605),
  ('অর্থনীতি',                    '109', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 606),
  ('অর্থনীতি',                    '110', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 607),
  ('ভূগোল',                       '125', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 608),
  ('ভূগোল',                       '126', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 609),
  ('পরিসংখ্যান',                  '129', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 610),
  ('পরিসংখ্যান',                  '130', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 611),
  ('যুক্তিবিদ্যা',                '121', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 612),
  ('যুক্তিবিদ্যা',                '122', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 613),
  ('সমাজকর্ম',                    '271', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 614),
  ('সমাজকর্ম',                    '272', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 615),
  ('সমাজবিজ্ঞান',                 '117', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 616),
  ('সমাজবিজ্ঞান',                 '118', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 617),
  ('কৃষিশিক্ষা',                  '239', 'optional', 'HSC', NULL, '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  618),
  ('কৃষিশিক্ষা',                  '240', 'optional', 'HSC', NULL, '11', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  619);

-- Class 12
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, is_only_optional, sort_order)
VALUES
  ('পৌরনীতি ও সুশাসন',           '269', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 600),
  ('পৌরনীতি ও সুশাসন',           '270', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 601),
  ('ইতিহাস',                      '304', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 602),
  ('ইতিহাস',                      '305', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 603),
  ('ইসলামের ইতিহাস ও সংস্কৃতি', '267', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 604),
  ('ইসলামের ইতিহাস ও সংস্কৃতি', '268', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 605),
  ('অর্থনীতি',                    '109', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 606),
  ('অর্থনীতি',                    '110', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 607),
  ('ভূগোল',                       '125', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 608),
  ('ভূগোল',                       '126', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, FALSE, 609),
  ('পরিসংখ্যান',                  '129', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 610),
  ('পরিসংখ্যান',                  '130', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 611),
  ('যুক্তিবিদ্যা',                '121', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 612),
  ('যুক্তিবিদ্যা',                '122', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 613),
  ('সমাজকর্ম',                    '271', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 614),
  ('সমাজকর্ম',                    '272', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 615),
  ('সমাজবিজ্ঞান',                 '117', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 616),
  ('সমাজবিজ্ঞান',                 '118', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, TRUE, FALSE, 617),
  ('কৃষিশিক্ষা',                  '239', 'optional', 'HSC', NULL, '12', 1, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  618),
  ('কৃষিশিক্ষা',                  '240', 'optional', 'HSC', NULL, '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, FALSE, TRUE, TRUE,  619);

-- ============================================================
-- STEP 15: BM (BMT) — CLASS 11 (১ম বর্ষ)
-- ============================================================

-- Compulsory
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, sort_order)
VALUES
  ('বাংলা-১',                            '21811', 'compulsory', 'BM', 'BM-General', '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 10),
  ('ইংরেজি-১',                           '21812', 'compulsory', 'BM', 'BM-General', '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 20),
  ('কম্পিউটার অফিস অ্যাপ্লিকেশন-১',      '21813', 'compulsory', 'BM', 'BM-General', '11', 1, TRUE, TRUE, TRUE,  50, 25, 25, FALSE, FALSE, 30),
  ('বিজনেস ম্যাথমেটিক্স অ্যান্ড স্ট্যাটিস্টিকস', '21814', 'compulsory', 'BM', 'BM-General', '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 40),
  ('হিসাববিজ্ঞান নীতি ও প্রয়োগ-১',       '21815', 'compulsory', 'BM', 'BM-General', '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 50),
  ('অর্থনীতি ও বাণিজ্যিক ভূগোল',         '21816', 'compulsory', 'BM', 'BM-General', '11', 1, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 60);

-- Trade Subjects
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, sort_order)
VALUES
  ('কম্পিউটারাইজড অ্যাকাউন্টিং সিস্টেম-১', '23118', 'group', 'BM', 'BM-General', '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 100),
  ('ডিজিটাল টেকনোলজি ইন বিজনেস-১',        '23318', 'group', 'BM', 'BM-General', '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 110),
  ('ফাইন্যান্সিয়াল কাস্টমার সার্ভিস-১',    '23218', 'group', 'BM', 'BM-General', '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 120),
  ('ই-মার্কেটিং-১',                        '23418', 'group', 'BM', 'BM-General', '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 130),
  ('হিউম্যান রিসোর্স ম্যানেজমেন্ট-১',      '23518', 'group', 'BM', 'BM-General', '11', 1, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 140);

-- ============================================================
-- STEP 16: BM (BMT) — CLASS 12 (২য় বর্ষ)
-- ============================================================

-- Compulsory
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, sort_order)
VALUES
  ('বাংলা-২',                             '21821', 'compulsory', 'BM', 'BM-General', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 10),
  ('ইংরেজি-২',                            '21822', 'compulsory', 'BM', 'BM-General', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 20),
  ('কম্পিউটার অফিস অ্যাপ্লিকেশন-২',       '21823', 'compulsory', 'BM', 'BM-General', '12', 2, TRUE, TRUE, TRUE,  50, 25, 25, FALSE, FALSE, 30),
  ('বিজনেস ইংলিশ অ্যান্ড কমিউনিকেশন',    '21824', 'compulsory', 'BM', 'BM-General', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 40),
  ('হিসাববিজ্ঞান নীতি ও প্রয়োগ-২',        '21825', 'compulsory', 'BM', 'BM-General', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 50),
  ('অফিস ম্যানেজমেন্ট',                   '21826', 'compulsory', 'BM', 'BM-General', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 60),
  ('ব্যবসায় সংগঠন ও ব্যবস্থাপনা',         '21837', 'compulsory', 'BM', 'BM-General', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 70),
  ('মার্কেটিং নীতি ও প্রয়োগ',              '21838', 'compulsory', 'BM', 'BM-General', '12', 2, TRUE, TRUE, FALSE, 70, 30, 0, FALSE, FALSE, 80);

-- Trade Subjects
INSERT INTO subjects
  (subject_name, subject_code, subject_type, branch, group_name, class_name, paper_number,
   has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks,
   is_group, is_optional, sort_order)
VALUES
  ('কম্পিউটারাইজড অ্যাকাউন্টিং সিস্টেম-২', '23128', 'group', 'BM', 'BM-General', '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 100),
  ('ডিজিটাল টেকনোলজি ইন বিজনেস-২',        '23328', 'group', 'BM', 'BM-General', '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 110),
  ('ফাইন্যান্সিয়াল কাস্টমার সার্ভিস-২',    '23228', 'group', 'BM', 'BM-General', '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 120),
  ('ই-মার্কেটিং-২',                        '23428', 'group', 'BM', 'BM-General', '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 130),
  ('হিউম্যান রিসোর্স ম্যানেজমেন্ট-২',      '23528', 'group', 'BM', 'BM-General', '12', 2, TRUE, TRUE, TRUE, 50, 25, 25, TRUE, FALSE, 140);

-- ============================================================
-- STEP 17: Verification
-- ============================================================

SELECT 
  'Total Subjects' AS info,
  branch,
  COUNT(*) AS count
FROM subjects
GROUP BY branch
UNION ALL
SELECT 
  'Grand Total',
  'ALL',
  COUNT(*)
FROM subjects;

-- ============================================================
-- ✅ Schema v5.0 তৈরি সম্পূর্ণ
-- ============================================================
-- Summary:
--   • 10 tables: classes, groups, exams, subjects, students,
--                student_subjects, results, result_details, 
--                result_audit_log + safe tables (admins, notices, ...)
--   • HSC Subjects: 3 groups (Science, Humanities, Business) + Optional
--   • BM Subjects: Class 11 + 12 (Compulsory + Trade)
--   • Duplicate allowed: group + optional for same subject
--   • K rishi Shikkha: শুধু optional (never group)
-- ============================================================