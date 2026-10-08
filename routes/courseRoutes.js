const express = require('express');
const router = express.Router();
const controller = require('../controllers/courseController');
const validateCourse = require('../middleware/validateCourse');

router.get('/', controller.redirectToCourses);
router.get('/courses', controller.getCourses);
router.get('/courses/new', controller.showCreateForm);
router.post('/courses', validateCourse, controller.addCourse);
router.get('/courses/:id', controller.findCourse, controller.getCourse);
router.get('/courses/:id/edit', controller.findCourse, controller.showEditForm);
router.post('/courses/:id/edit', controller.findCourse, validateCourse, controller.updateCourse);
router.post('/courses/:id/delete', controller.findCourse, controller.deleteCourse);

module.exports = router;
