const getCorrectFileName = filename => {
    if (filename) {
        // replace unsafe characters
        return filename.replace(/[\s*/:;&?@$()<>#%\{\}|\\\^\~\[\]]/g, '-');
    }
    return filename;
};

const getProjectionFromFields = fields => {
    const fieldsArray = fields && fields.length > 0 ? fields.split(',') : [];
    return Object.assign({}, ...fieldsArray.map(key => ({ [key]: 1 })));
};

const deepCopy = obj => {
    return JSON.parse(JSON.stringify(obj));
}

module.exports = {
    getCorrectFileName,
    getProjectionFromFields,
    deepCopy
};
