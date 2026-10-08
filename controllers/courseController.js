const { courses } = require('../models/courseModel');

let nextId = Math.max(...courses.map(course => course.id)) + 1;

function redirectToCourses(req, res) {
    res.redirect('/courses');
}

function getCourses(req, res) {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const semester = typeof req.query.semester === 'string' ? req.query.semester : '';
    let filteredCourses = courses;

    if (search) {
        const text = search.toLowerCase();
        filteredCourses = filteredCourses.filter(course =>
            course.title.toLowerCase().includes(text) ||
            course.teacher.toLowerCase().includes(text)
        );
    }

    if (semester) {
        filteredCourses = filteredCourses.filter(course => course.semester === Number(semester));
    }

    res.render('courses/index', { courses: filteredCourses, search, semester });
}

// Проверяем существование курса перед просмотром, изменением и удалением.
function findCourse(req, res, next) {
    const course = courses.find(course => course.id === Number(req.params.id));

    if (!course) {
        return res.status(404).render('404', {
            message: 'Курс не найден',
            url: req.originalUrl
        });
    }

    req.course = course;
    next();
}

function getCourse(req, res) {
    res.render('courses/details', { course: req.course });
}

function showCreateForm(req, res) {
    res.render('courses/create', { course: {}, errors: [] });
}

function addCourse(req, res) {
    courses.push({ id: nextId++, ...req.courseData });
    res.redirect('/courses');
}

function showEditForm(req, res) {
    res.render('courses/edit', { course: req.course, errors: [] });
}

function updateCourse(req, res) {
    Object.assign(req.course, req.courseData);
    res.redirect('/courses/' + req.course.id);
}

function deleteCourse(req, res) {
    const index = courses.findIndex(course => course.id === req.course.id);
    courses.splice(index, 1);
    res.redirect('/courses');
}

module.exports = {
    redirectToCourses,
    getCourses,
    findCourse,
    getCourse,
    showCreateForm,
    addCourse,
    showEditForm,
    updateCourse,
    deleteCourse
};
