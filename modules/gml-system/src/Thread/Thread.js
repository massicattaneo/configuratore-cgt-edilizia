import wait from './wait';
import Queue from './Queue';

function execute({ context, statement, system, injected, thread }) {
    try {
        context.prevStatement = context.actualStatement;
        if (statement instanceof Function) {
            context.actualStatement = statement.name || '';
            return statement.call(context, { system, gos: injected.gos, thread, wait, Queue });
        } else {
            context.actualStatement = statement;
            return injected.statements[statement].call(context, { system, gos: injected.gos, thread, wait, Queue });
        }
    } catch (error) {
        const description = error.message;
        const type = 'JAVASCRIPT ERROR';
        console.error(error);
        system.throw('system', { description, type });
    }
}

let pointer = 1;

export default function (system, callback) {
    const thread = { pointer: pointer++ };

    const ctx = {};
    const injected = callback.call(ctx, system) || {};

    thread.execute = (statement, context) => {
        return execute({ context: context || ctx, statement, system, injected, thread }) || wait.time(0)
    };

    thread.inject = function (o) {
        Object.assign(injected, o);
    };

    return thread;
}
