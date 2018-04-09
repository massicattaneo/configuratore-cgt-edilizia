export default function () {
    const { date } = this;
    const array = date.split('/');
    return (new Date(array[2], array[1], array[0])).getTime()
}