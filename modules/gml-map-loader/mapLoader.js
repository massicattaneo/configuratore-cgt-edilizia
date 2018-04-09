function mapToArray(str) {
    const lines = str.split('\n');
    const maxChars = lines.map((s, i) => {
        return { length: s.length, index: i }
    }).sort((a, b) => b.length - a.length)[0].length;
    return new Array(lines.length).fill(0).map(function (o, i) {
        var line = lines[i].split('');
        return line.concat(new Array(maxChars - line.length).fill(''));
    });
}

module.exports = mapToArray;
