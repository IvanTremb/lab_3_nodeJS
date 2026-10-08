function validateCourse(req, res, next) {
    const body = req.body || {};
    const course = {};
    const errors = [];

    // Сохраняем введённые строки, чтобы снова показать их при ошибке.
    for (const field of ['title', 'teacher', 'credits', 'semester', 'description']) {
        course[field] = typeof body[field] === 'string' ? body[field].trim() : '';
    }

    if (!course.title) {
        errors.push('Название дисциплины обязательно');
    }
    if (!course.teacher) {
        errors.push('Укажите преподавателя');
    }

    const credits = Number(course.credits);
    if (!Number.isFinite(credits) || credits <= 0) {
        errors.push('Количество кредитов должно быть положительным числом');
    }

    const semester = Number(course.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
        errors.push('Семестр должен быть целым числом в диапазоне от 1 до 8');
    }
    if (!course.description) {
        errors.push('Описание дисциплины обязательно');
    }

    if (errors.length > 0) {
        const view = req.course ? 'courses/edit' : 'courses/create';
        if (req.course) {
            course.id = req.course.id;
        }
        return res.status(400).render(view, { course, errors });
    }

    req.courseData = { ...course, credits, semester };
    next();
}

module.exports = validateCourse;
