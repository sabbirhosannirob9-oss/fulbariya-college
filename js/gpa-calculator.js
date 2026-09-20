/**
 * =========================================================
 * FULBARIYA COLLEGE — GPA CALCULATOR
 * Location: js/gpa-calculator.js
 * Version: v2.0 — Document-Based Pass Marks + Individual Component Rule
 * 
 * Rules (Bangladesh Education Board):
 *  - Paper GPA = (CQ+MCQ+P) / max → grade point
 *  - Subject GPA = average of paper GPAs
 *  - Overall GPA = (Sum of Main 6 GPA + 4th Bonus) / 6
 *  - Fail: any compulsory subject fail or any component < pass mark
 *  - 4th Bonus = max(0, 4th GPA - 2.00)
 * 
 * ✅ Pass Marks (Document-based exact values):
 *  - 100 Full → Pass 33
 *  - 70 Full  → Pass 23
 *  - 60 Full  → Pass 20
 *  - 50 Full  → Pass 17
 *  - 40 Full  → Pass 13
 *  - 30 Full  → Pass 10
 *  - 25 Full  → Pass 8
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // 🎯 PASS MARK CALCULATOR (Document-Based)
    // =========================================================
    /**
     * Calculate pass mark based on full marks.
     * Uses Document-specified exact values.
     * 
     * @param {number} fullMarks - Full marks of component
     * @returns {number} - Pass mark
     */
    function calcPassMark(fullMarks) {
        const f = parseFloat(fullMarks) || 0;
        if (f === 0) return 0;

        // ✅ Document-based exact values
        const PASS_MAP = {
            100: 33,
            70: 23,
            60: 20,
            50: 17,
            40: 13,
            30: 10,
            25: 8,
            20: 7,
            15: 5,
            10: 4
        };

        if (PASS_MAP[f] !== undefined) return PASS_MAP[f];

        // Fallback: 33.33% rounded up
        return Math.ceil(f * 0.3333);
    }

    // =========================================================
    // GRADE HELPERS
    // =========================================================
    function percentToGrade(percent) {
        if (percent >= 80) return { grade: 'A+', gp: 5.00 };
        if (percent >= 70) return { grade: 'A', gp: 4.00 };
        if (percent >= 60) return { grade: 'A-', gp: 3.50 };
        if (percent >= 50) return { grade: 'B', gp: 3.00 };
        if (percent >= 40) return { grade: 'C', gp: 2.00 };
        if (percent >= 33) return { grade: 'D', gp: 1.00 };
        return { grade: 'F', gp: 0.00 };
    }

    function gpToGrade(gp) {
        if (gp >= 5.00) return 'A+';
        if (gp >= 4.00) return 'A';
        if (gp >= 3.50) return 'A-';
        if (gp >= 3.00) return 'B';
        if (gp >= 2.00) return 'C';
        if (gp >= 1.00) return 'D';
        return 'F';
    }

    function getGradeClass(grade) {
        const map = {
            'A+': 'Aplus', 'A': 'A', 'A-': 'Aminus',
            'B': 'B', 'C': 'C', 'D': 'D', 'F': 'F'
        };
        return map[grade] || 'F';
    }

    function getGPAClass(gpa) {
        if (gpa >= 4.50) return 'high';
        if (gpa >= 3.00) return 'mid';
        return 'low';
    }

    // =========================================================
    // 🎯 PAPER GPA CALCULATION (Individual Component Pass)
    // =========================================================
    /**
     * @param {object} marks - { cq, mcq, practical }
     * @param {object} maxMarks - { cq, mcq, practical, hasCq, hasMcq, hasPractical }
     * @returns {object} - { total, maxTotal, percent, grade, gp, failed, failReason }
     */
    function calculatePaperGPA(marks, maxMarks) {
        const cq = parseFloat(marks.cq) || 0;
        const mcq = parseFloat(marks.mcq) || 0;
        const practical = parseFloat(marks.practical) || 0;

        const maxCq = maxMarks.hasCq ? (parseFloat(maxMarks.cq) || 0) : 0;
        const maxMcq = maxMarks.hasMcq ? (parseFloat(maxMarks.mcq) || 0) : 0;
        const maxP = maxMarks.hasPractical ? (parseFloat(maxMarks.practical) || 0) : 0;

        const total = cq + mcq + practical;
        const maxTotal = maxCq + maxMcq + maxP;

        if (maxTotal === 0) {
            return {
                total: 0, maxTotal: 0, percent: 0,
                grade: 'F', gp: 0, failed: true,
                failReason: 'Invalid max marks'
            };
        }

        const percent = Math.round((total / maxTotal) * 10000) / 100;
        const { grade, gp } = percentToGrade(percent);

        // ✅ Individual Component Pass Check (Document-based)
        let failed = false;
        let failReason = '';

        if (maxCq > 0 && cq < calcPassMark(maxCq)) {
            failed = true;
            failReason = `CQ fail (${cq}/${maxCq}, need ${calcPassMark(maxCq)})`;
        } else if (maxMcq > 0 && mcq < calcPassMark(maxMcq)) {
            failed = true;
            failReason = `MCQ fail (${mcq}/${maxMcq}, need ${calcPassMark(maxMcq)})`;
        } else if (maxP > 0 && practical < calcPassMark(maxP)) {
            failed = true;
            failReason = `Practical fail (${practical}/${maxP}, need ${calcPassMark(maxP)})`;
        }

        return {
            total,
            maxTotal,
            percent,
            grade: failed ? 'F' : grade,
            gp: failed ? 0 : gp,
            failed,
            failReason
        };
    }

    // =========================================================
    // SUBJECT (BOOK) GPA CALCULATION
    // =========================================================
    /**
     * @param {array} paperResults - [{gp, failed}, {gp, failed}]
     * @returns {object} - { gp, grade, failed }
     */
    function calculateSubjectGPA(paperResults) {
        if (!paperResults || paperResults.length === 0) {
            return { gp: 0, grade: 'F', failed: true };
        }

        // If any paper failed → subject fail
        const anyFail = paperResults.some(p => p.failed);
        if (anyFail) {
            return { gp: 0, grade: 'F', failed: true };
        }

        // Average GP
        const sum = paperResults.reduce((s, p) => s + (p.gp || 0), 0);
        const avgGP = sum / paperResults.length;
        const roundedGP = Math.round(avgGP * 100) / 100;

        return {
            gp: roundedGP,
            grade: gpToGrade(roundedGP),
            failed: false
        };
    }

    // =========================================================
    // 🎯 OVERALL GPA CALCULATION (4th Subject Grace Rule)
    // =========================================================
    /**
     * @param {array} subjects - [{name, type, gp, failed}]
     *   type: 'compulsory' | 'group' | 'optional'
     * @returns {object} - { gpa, grade, status, failReason, breakdown }
     */
    function calculateOverallGPA(subjects) {
        if (!subjects || subjects.length === 0) {
            return { gpa: 0, grade: 'F', status: 'fail', failReason: 'No subjects' };
        }

        // Step 1: Compulsory fail check
        const compulsorySubjects = subjects.filter(s => s.type === 'compulsory');
        const compulsoryFail = compulsorySubjects.find(s => s.failed);

        if (compulsoryFail) {
            return {
                gpa: 0,
                grade: 'F',
                status: 'fail',
                failReason: `Compulsory subject fail: ${compulsoryFail.name}`,
                breakdown: null
            };
        }

        // Step 2: Group/main fail check
        const mainSubjects = subjects.filter(s => s.type !== 'optional');
        const mainFail = mainSubjects.find(s => s.failed);

        if (mainFail) {
            return {
                gpa: 0,
                grade: 'F',
                status: 'fail',
                failReason: `Main subject fail: ${mainFail.name}`,
                breakdown: null
            };
        }

        // Step 3: Main GPA sum
        const mainSum = mainSubjects.reduce((sum, s) => sum + (s.gp || 0), 0);
        const mainCount = mainSubjects.length;

        if (mainCount === 0) {
            return { gpa: 0, grade: 'F', status: 'fail', failReason: 'No main subjects' };
        }

        // ✅ Step 4: 4th subject bonus (grace rule)
        // 4th fail → no propagation, no bonus
        // 4th pass → bonus = max(0, GP - 2.00)
        const optional = subjects.find(s => s.type === 'optional');
        let bonus = 0;
        if (optional && !optional.failed && optional.gp > 2.00) {
            bonus = optional.gp - 2.00;
        }

        // Step 5: Overall GPA
        let gpa = (mainSum + bonus) / mainCount;
        if (gpa > 5.00) gpa = 5.00;
        gpa = Math.round(gpa * 100) / 100;

        return {
            gpa,
            grade: gpToGrade(gpa),
            status: 'pass',
            failReason: null,
            breakdown: {
                mainSum: Math.round(mainSum * 100) / 100,
                mainCount,
                bonus: Math.round(bonus * 100) / 100,
                mainGPA: Math.round((mainSum / mainCount) * 100) / 100
            }
        };
    }

    // =========================================================
    // BMT GPA CALCULATION
    // =========================================================
    function calculateBMTGPA(subjects) {
        if (!subjects || subjects.length === 0) {
            return { gpa: 0, grade: 'F', status: 'fail' };
        }

        const anyFail = subjects.some(s => s.failed);
        if (anyFail) {
            return { gpa: 0, grade: 'F', status: 'fail' };
        }

        const sum = subjects.reduce((s, sub) => s + (sub.gp || 0), 0);
        const avg = sum / subjects.length;
        const gpa = Math.round(avg * 100) / 100;

        return {
            gpa,
            grade: gpToGrade(gpa),
            status: 'pass'
        };
    }

    // =========================================================
    // 🎯 BMT PAPER GPA (Board + Continuous)
    // =========================================================
    /**
     * @param {number} boardMarks - Board marks
     * @param {number} continuousMarks - Continuous marks
     * @param {number} maxBoard - Max board marks
     * @param {number} maxContinuous - Max continuous marks
     * @returns {object} - { total, maxTotal, percent, grade, gp, failed, failReason }
     */
    function calculateBMTPaperGPA(boardMarks, continuousMarks, maxBoard, maxContinuous) {
        const board = parseFloat(boardMarks) || 0;
        const cont = parseFloat(continuousMarks) || 0;
        const total = board + cont;

        const maxB = parseFloat(maxBoard) || 0;
        const maxC = parseFloat(maxContinuous) || 0;
        const maxTotal = maxB + maxC;

        if (maxTotal === 0) {
            return { total: 0, maxTotal: 0, percent: 0, grade: 'F', gp: 0, failed: true, failReason: 'Invalid max marks' };
        }

        const percent = Math.round((total / maxTotal) * 10000) / 100;
        const { grade, gp } = percentToGrade(percent);

        // ✅ Individual Component Pass Check (Board + Continuous)
        let failed = false;
        let failReason = '';

        if (maxB > 0 && board < calcPassMark(maxB)) {
            failed = true;
            failReason = `Board fail (${board}/${maxB}, need ${calcPassMark(maxB)})`;
        } else if (maxC > 0 && cont < calcPassMark(maxC)) {
            failed = true;
            failReason = `Continuous fail (${cont}/${maxC}, need ${calcPassMark(maxC)})`;
        }

        return {
            total,
            maxTotal,
            percent,
            grade: failed ? 'F' : grade,
            gp: failed ? 0 : gp,
            failed,
            failReason
        };
    }

    // =========================================================
    // VALIDATE MARKS
    // =========================================================
    function validateMarks(value, max) {
        const v = parseFloat(value);
        if (isNaN(v)) return { valid: true, value: '' };
        if (v < 0) return { valid: false, value: 0, message: 'ঋণাত্মক হবে না' };
        if (v > max) return { valid: false, value: max, message: `সর্বোচ্চ ${max}` };
        return { valid: true, value: v };
    }

    // =========================================================
    // EXPORT
    // =========================================================
    window.FDCGPA = {
        // ✅ Document-based pass mark
        calcPassMark,

        // Helpers
        percentToGrade,
        gpToGrade,
        getGradeClass,
        getGPAClass,
        validateMarks,

        // Calculations
        calculatePaperGPA,
        calculateSubjectGPA,
        calculateOverallGPA,

        // BMT
        calculateBMTGPA,
        calculateBMTPaperGPA
    };

    console.log('✅ GPA Calculator v2.0 loaded — Document-based Pass Marks');

})();