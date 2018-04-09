import S from './src/system';
export const System = S;

export function plugin(fn) {
    document.addEventListener(`execute-plugin-${fn.name}`, function (data) {
        data.detail.inject(fn);
    })
}
