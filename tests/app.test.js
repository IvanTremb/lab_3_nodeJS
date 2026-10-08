const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');
const { courses } = require('../models/courseModel');

const originalCourses = structuredClone(courses);
let server;
let baseUrl;

before(async () => {
    server = await new Promise((resolve, reject) => {
        const listener = app.listen(0, '127.0.0.1', err => {
            if (err) return reject(err);
            resolve(listener);
        });
        listener.on('error', reject);
    });
    baseUrl = 'http://127.0.0.1:' + server.address().port;
});

beforeEach(() => {
    courses.splice(0, courses.length, ...structuredClone(originalCourses));
});

after(async () => {
    if (server) {
        await new Promise(resolve => server.close(resolve));
    }
});

async function request(url, data) {
    const options = { redirect: 'manual' };
    if (data !== undefined) {
        options.method = 'POST';
        options.body = new URLSearchParams(data);
    }
    const response = await fetch(baseUrl + url, options);
    const html = await response.text();
    return { status: response.status, headers: response.headers, html };
}

function validCourse() {
    return {
        title: 'Node.js Practice',
        teacher: 'Ivan Trembaci',
        credits: '5',
        semester: '2',
        description: 'Практические занятия по Node.js'
    };
}

test('Главная страница, список, формы, карточка и CSS доступны', async () => {
    const home = await request('/');
    assert.equal(home.status, 302);
    assert.equal(home.headers.get('location'), '/courses');

    for (const url of ['/courses', '/courses/new', '/courses/1', '/courses/1/edit']) {
        const page = await request(url);
        assert.equal(page.status, 200);
        assert.ok(page.html.includes('Система управления учебными курсами'));
        assert.ok(page.html.includes('Ivan Trembaci · IA2302'));
        assert.ok(page.html.includes(String(new Date().getFullYear())));
    }

    const details = await request('/courses/1');
    assert.ok(details.html.includes(originalCourses[0].description));
    assert.ok(details.html.includes("confirm('Удалить этот курс?')"));
    const css = await request('/css/style.css');
    assert.equal(css.status, 200);
    assert.ok(css.headers.get('content-type').includes('text/css'));
});

test('Поиск по названию и преподавателю, семестр и оба условия вместе', async () => {
    const titleSearch = await request('/courses?search=SERVER');
    assert.ok(titleSearch.html.includes('Server-side Programming'));
    assert.ok(!titleSearch.html.includes('Database Management Systems'));

    const teacherSearch = await request('/courses?search=IVAN');
    assert.ok(teacherSearch.html.includes('Server-side Programming'));
    assert.ok(teacherSearch.html.includes('Data Structures and Algorithms'));

    const semester = await request('/courses?semester=1');
    assert.ok(semester.html.includes('Web Development'));
    assert.ok(!semester.html.includes('Data Structures and Algorithms'));

    const combined = await request('/courses?search=ivan&semester=3');
    assert.ok(combined.html.includes('Data Structures and Algorithms'));
    assert.ok(!combined.html.includes('Server-side Programming'));
    assert.ok(combined.html.includes('value="ivan"'));
    assert.ok(combined.html.includes('value="3" selected'));

    const empty = await request('/courses?search=unknown');
    assert.ok(empty.html.includes('Курсы не найдены'));
});

test('Добавление, редактирование и удаление курса через HTML-формы', async () => {
    const created = await request('/courses', { ...validCourse(), id: '1' });
    assert.equal(created.status, 302);
    assert.equal(created.headers.get('location'), '/courses');
    assert.equal(courses.length, originalCourses.length + 1);
    const course = courses[courses.length - 1];
    assert.notEqual(course.id, 1);
    assert.equal(course.credits, 5);
    assert.equal(course.semester, 2);
    assert.ok((await request('/courses')).html.includes('Node.js Practice'));

    const editForm = await request('/courses/' + course.id + '/edit');
    assert.ok(editForm.html.includes('value="Node.js Practice"'));
    const updated = await request('/courses/' + course.id + '/edit', {
        ...validCourse(), title: 'Updated course', credits: '6.5', semester: '8'
    });
    assert.equal(updated.status, 302);
    assert.equal(updated.headers.get('location'), '/courses/' + course.id);
    assert.equal(course.title, 'Updated course');
    assert.equal(course.credits, 6.5);
    assert.ok((await request('/courses/' + course.id)).html.includes('Updated course'));

    const deleted = await request('/courses/' + course.id + '/delete', {});
    assert.equal(deleted.status, 302);
    assert.equal(deleted.headers.get('location'), '/courses');
    assert.equal(courses.length, originalCourses.length);
    assert.equal((await request('/courses/' + course.id)).status, 404);
});

test('Валидация не допускает добавление и изменение некорректных данных', async () => {
    const invalidFields = [
        { title: '   ' }, { teacher: '' }, { description: ' ' },
        { credits: '' }, { credits: 'abc' }, { credits: '0' },
        { credits: '-1' }, { credits: 'Infinity' },
        { semester: '' }, { semester: '0' }, { semester: '9' },
        { semester: '1.5' }, { semester: 'abc' }
    ];

    for (const fields of invalidFields) {
        for (const url of ['/courses', '/courses/1/edit']) {
            const page = await request(url, { ...validCourse(), ...fields });
            assert.equal(page.status, 400, JSON.stringify(fields));
            assert.ok(page.html.includes('Проверьте введённые данные'));
            assert.deepEqual(courses, originalCourses);
        }
    }

    const invalidEdit = await request('/courses/1/edit', { ...validCourse(), credits: '-1' });
    assert.ok(invalidEdit.html.includes('value="Node.js Practice"'));
    assert.ok(invalidEdit.html.includes('value="Ivan Trembaci"'));
    assert.ok(invalidEdit.html.includes('value="-1"'));
    assert.ok(invalidEdit.html.includes('Практические занятия по Node.js'));
    assert.ok(invalidEdit.html.includes('action="/courses/1/edit"'));

    const missing = await request('/courses', {});
    assert.equal(missing.status, 400);
    assert.deepEqual(courses, originalCourses);
});

test('Неизвестные маршруты и отсутствующие курсы возвращают 404', async () => {
    for (const url of ['/missing', '/courses/999', '/courses/abc', '/courses/999/edit']) {
        const page = await request(url);
        assert.equal(page.status, 404);
        assert.ok(page.html.includes(url));
        assert.ok(page.html.includes('К списку курсов'));
    }
    for (const url of ['/courses/999/edit', '/courses/999/delete']) {
        const page = await request(url, {});
        assert.equal(page.status, 404);
    }
    assert.deepEqual(courses, originalCourses);
});

test('Пользовательский HTML отображается как текст', async () => {
    const title = '<script>alert("test")</script>';
    await request('/courses', { ...validCourse(), title });
    const course = courses[courses.length - 1];
    for (const url of ['/courses', '/courses/' + course.id, '/courses/' + course.id + '/edit']) {
        const page = await request(url);
        assert.ok(!page.html.includes(title));
        assert.ok(page.html.includes('&lt;script&gt;'));
    }
});

test('Логирование включает метод, URL, дату и время для страниц и статики', async () => {
    const lines = [];
    const originalLog = console.log;
    console.log = line => lines.push(line);
    try {
        await request('/courses?semester=1');
        await request('/css/style.css');
        await request('/missing');
        await request('/courses', validCourse());
    } finally {
        console.log = originalLog;
    }
    assert.equal(lines.length, 4);
    assert.match(lines[0], /^GET \| \/courses\?semester=1 \| \d{2}\.\d{2}\.\d{4},? \d{2}:\d{2}/);
    assert.ok(lines[1].startsWith('GET | /css/style.css |'));
    assert.ok(lines[2].startsWith('GET | /missing |'));
    assert.ok(lines[3].startsWith('POST | /courses |'));
});

test('Внутренняя ошибка отображает страницу 500 без технических подробностей', async () => {
    const originalRender = app.render;
    const originalError = console.error;
    console.error = () => {};
    app.render = function(view, options, callback) {
        if (view === 'courses/index') {
            return callback(new Error('Private test error'));
        }
        return originalRender.call(this, view, options, callback);
    };
    try {
        const page = await request('/courses');
        assert.equal(page.status, 500);
        assert.ok(page.html.includes('Внутренняя ошибка сервера'));
        assert.ok(!page.html.includes('Private test error'));
        assert.ok(!page.html.includes('app.test.js'));
    } finally {
        app.render = originalRender;
        console.error = originalError;
    }
});
