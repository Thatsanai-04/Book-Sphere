const notFound = (req, res, next) => {
    res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    if (err.name === "ValidationError") {
        return res.status(400).json({ message: err.message });
    }
    if (err.name === "MulterError") {
        return res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "E-Book files must be 50 MB or smaller" : err.message });
    }
    if (err.name === "CastError") {
        return res.status(400).json({ message: `Invalid id: ${err.value}` });
    }
    if (err.code === 11000) {
        return res.status(409).json({ message: "A record with this value already exists" });
    }
    res.status(500).json({ message: err.message || "Server error" });
};

module.exports = { notFound, errorHandler };
