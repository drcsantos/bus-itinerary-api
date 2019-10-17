const haversine = require('haversine');

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

const getAverageFromPoints = (points, useCoords = true) => {
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

const getRouteLength = (points, useCoords = true) => {
    let distance = 0;
    let lastPoint = null;
    points.forEach(point => {
        const coords = useCoords ? point.coords : point;
        if (lastPoint) {
            distante += haversine(
                { latitude: lastPoint.lat, longitude: lastPoint.lng },
                { latitude: coords.lat, longitude: coords.lng }
            );
        }
        lastPoint = coords;
    });
    return distance;
};

module.exports = {
    getCorrectFileName,
    getProjectionFromFields,
    deepCopy,
    coords,
    getAverageFromPoints,
    getRouteLength
};
