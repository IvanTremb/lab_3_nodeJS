const express = require('express');
const path = require('path');
const courseRoutes = require('./routes/courseRoutes');
const logger = require('./middleware/logger');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(logger);
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(courseRoutes);

app.use((req, res) => {
    res.status(404).render('404', {
        message: 'Страница не найдена',
        url: req.originalUrl
    });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error');
});

if (require.main === module) {
    app.listen(3000, err => {
        if (err) {
            console.error('Не удалось запустить сервер:', err.message);
            process.exitCode = 1;
            return;
        }
        console.log('Server is running at http://localhost:3000');
    });
}

module.exports = app;
