import { describe, expect, it } from 'vitest';

import { Agenda } from './Agenda.js';

describe('Agenda', () => {
  describe('schedule', () => {
    it('must run a task in the scope it was scheduled in', () => {
      const agenda = new Agenda('root');
      const scopes: string[] = [];

      agenda.within('a', () =>
        agenda.schedule(() => scopes.push(agenda.scope()))
      );
      agenda.drain();

      expect(scopes).toEqual(['a']);
    });

    it('must run a task scheduled outside any scope in the root one', () => {
      const agenda = new Agenda('root');
      const scopes: string[] = [];

      agenda.schedule(() => scopes.push(agenda.scope()));
      agenda.within('a', () => agenda.schedule(() => undefined));
      agenda.drain();

      expect(scopes).toEqual(['root']);
    });

    it('must run what a task schedules in the scope of that task', () => {
      const agenda = new Agenda('root');
      const scopes: string[] = [];

      agenda.within('a', () =>
        agenda.schedule(() =>
          agenda.schedule(() => scopes.push(agenda.scope()))
        )
      );
      agenda.drain();

      expect(scopes).toEqual(['a']);
    });
  });

  describe('drain', () => {
    it('must run the task scheduled last first', () => {
      const agenda = new Agenda('root');
      const ran: string[] = [];

      agenda.schedule(() => ran.push('a'));
      agenda.schedule(() => ran.push('b'));
      agenda.drain();

      expect(ran).toEqual(['b', 'a']);
    });

    it('must run what a task schedules before what was scheduled earlier', () => {
      const agenda = new Agenda('root');
      const ran: string[] = [];

      agenda.schedule(() => ran.push('a'));
      agenda.schedule(() => {
        ran.push('b');
        agenda.schedule(() => ran.push('c'));
      });
      agenda.drain();

      expect(ran).toEqual(['b', 'c', 'a']);
    });

    it('must restore the scope it was started in', () => {
      const agenda = new Agenda('root');
      const scopes: string[] = [];

      agenda.within('a', () => agenda.schedule(() => undefined));
      agenda.within('b', () => {
        agenda.drain();
        scopes.push(agenda.scope());
      });

      expect(scopes).toEqual(['b']);
    });
  });

  describe('clear', () => {
    it('must drop the tasks that have not run yet', () => {
      const agenda = new Agenda('root');
      const ran: string[] = [];

      agenda.schedule(() => ran.push('a'));
      agenda.schedule(() => {
        ran.push('b');
        agenda.clear();
      });
      agenda.drain();

      expect(ran).toEqual(['b']);
    });

    it('must keep running tasks scheduled after it', () => {
      const agenda = new Agenda('root');
      const ran: string[] = [];

      agenda.schedule(() => ran.push('a'));
      agenda.clear();
      agenda.schedule(() => ran.push('b'));
      agenda.drain();

      expect(ran).toEqual(['b']);
    });
  });

  describe('after', () => {
    it('must resume only once everything the action started is done', () => {
      const agenda = new Agenda('root');
      const ran: string[] = [];

      agenda.after(
        () => {
          ran.push('work');
          agenda.schedule(() => {
            ran.push('started');
            agenda.schedule(() => ran.push('started in turn'));
          });
        },
        () => ran.push('then')
      );
      agenda.drain();

      expect(ran).toEqual(['work', 'started', 'started in turn', 'then']);
    });

    it('must resume in the scope it was asked in', () => {
      const agenda = new Agenda('root');
      const scopes: string[] = [];

      agenda.within('a', () =>
        agenda.after(
          () => undefined,
          () => scopes.push(agenda.scope())
        )
      );
      agenda.drain();

      expect(scopes).toEqual(['a']);
    });
  });

  describe('each', () => {
    it('must pull the next item only once the work for the previous one is done', () => {
      const agenda = new Agenda('root');
      const events: string[] = [];

      function* items() {
        events.push('pull a');
        yield 'a';
        events.push('pull b');
        yield 'b';
      }

      agenda.each(items(), item => {
        events.push(`visit ${item}`);
        agenda.schedule(() => events.push(`work for ${item}`));
      });
      agenda.drain();

      expect(events).toEqual([
        'pull a',
        'visit a',
        'work for a',
        'pull b',
        'visit b',
        'work for b',
      ]);
    });

    it('must not pull further items once cleared', () => {
      const agenda = new Agenda('root');
      const pulled: string[] = [];

      function* items() {
        pulled.push('a');
        yield 'a';
        pulled.push('b');
        yield 'b';
      }

      agenda.each(items(), () => agenda.clear());
      agenda.drain();

      expect(pulled).toEqual(['a']);
    });
  });

  describe('within', () => {
    it('must run an action in a scope', () => {
      const agenda = new Agenda('root');
      const scopes: string[] = [];

      agenda.within('a', () => scopes.push(agenda.scope()));

      expect(scopes).toEqual(['a']);
    });

    it('must restore the scope it was entered from', () => {
      const agenda = new Agenda('root');
      const scopes: string[] = [];

      agenda.within('a', () => {
        agenda.within('b', () => undefined);
        scopes.push(agenda.scope());
      });
      scopes.push(agenda.scope());

      expect(scopes).toEqual(['a', 'root']);
    });
  });
});
