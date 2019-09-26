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
};

function roundN(value, digits) {
    const tenToN = 10 ** digits;
    return (Math.trunc(value * tenToN)) / tenToN;
}

const coords = (lat, lng) => ({
    lat: roundN(lat, 6),
    lng: roundN(lng, 6)
})

const getCenterFromPoints = (points, useCoords = true) => {
    let latSum = 0;
    let lngSum = 0;
    const average = value => points.length === 0 ? 0 : value / points.length;
    points.forEach(point => {
        const { lat, lng } = useCoords ? point.coords : point;
        latSum += lat;
        lngSum += lng;
    });
    return points.length === 0 ? null : coords(average(latSum), average(lngSum));
};

module.exports = {
    getCorrectFileName,
    getProjectionFromFields,
    deepCopy,
    coords,
    getCenterFromPoints
};
