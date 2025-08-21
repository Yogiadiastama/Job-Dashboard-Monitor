type EventHandler = (data?: any) => void;

interface Events {
  [key: string]: EventHandler[];
}

const events: Events = {};

export const eventBus = {
  dispatch(event: string, data?: any) {
    if (!events[event]) return;
    // We use a custom event to pass data through the DOM event system if needed,
    // but a direct callback is simpler for React components.
    events[event].forEach(callback => callback(data));
  },
  on(event: string, callback: EventHandler) {
    if (!events[event]) {
      events[event] = [];
    }
    events[event].push(callback);
  },
  remove(event: string, callback: EventHandler) {
    if (!events[event]) return;
    const index = events[event].indexOf(callback);
    if (index > -1) {
      events[event].splice(index, 1);
    }
  },
};
