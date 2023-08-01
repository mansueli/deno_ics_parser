type Event = {
  type?: string;
  startDate?: Date;
  endDate?: Date;
  end?: Date;
  completed?: Date;
  due?: Date;
  uid?: string;
  name?: string;
  description?: string;
  location?: string;
  url?: string;
  organizer?: { name?: string; mail: string };
  geo?: { latitude: number; longitude: number };
  categories?: string[];
  attendee?: { name?: string; mail: string }[];
};

type DateKey = 'startDate' | 'endDate' | 'end' | 'completed' | 'due';
type StringKey = 'type' | 'uid' | 'name' | 'description' | 'location' | 'url';

function generateDateFunction(name: DateKey) {
  return function (value: string, params: any, events: Event[], lastEvent: Event) {
    const matches = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
    if (matches !== null) {
      lastEvent[name] = new Date(
        parseInt(matches[1], 10),
        parseInt(matches[2], 10) - 1,
        parseInt(matches[3], 10)
      );
      return lastEvent;
    }

    if (/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.test(value)) {
      lastEvent[name] = new Date(
        value.substring(0, 4) +
          '-' +
          value.substring(4, 6) +
          '-' +
          value.substring(6, 11) +
          ':' +
          value.substring(11, 13) +
          ':' +
          value.substring(13)
      );
    }
    return lastEvent;
  };
}

function generateSimpleParamFunction(name: StringKey) {
  return function (value: string, params: any, events: Event[], lastEvent: Event) {
    lastEvent[name] = value.replace(/\\n/g, '\n');
    return lastEvent;
  };
}

const objects: Record<string, (value: string, params: any, events: Event[], lastEvent: Event, data?: Event[]) => Event> = {
  'BEGIN': function objectBegin(value: string, params: any, events: Event[], lastEvent: Event) {
    if (value === 'VCALENDAR') {
      return lastEvent;
    }

    lastEvent = {
      type: value,
    } as Event;
    events.push(lastEvent);

    return lastEvent;
  },

  'END': function objectEnd(value: string, params: any, events: Event[], lastEvent: Event, data?: Event[]) {
    if (value === 'VCALENDAR') {
      return lastEvent;
    }

    if (data) {
      data.push(lastEvent);
    }

    const index = events.indexOf(lastEvent);
    if (index !== -1) {
      events.splice(events.indexOf(lastEvent), 1);
    }

    if (events.length === 0) {
      lastEvent = {};
    } else {
      lastEvent = events[events.length - 1];
    }

    return lastEvent;
  },

  'DTSTART': generateDateFunction('startDate'),
  'DTEND': generateDateFunction('endDate'),
  'DTSTAMP': generateDateFunction('end'),
  'COMPLETED': generateDateFunction('completed'),
  'DUE': generateDateFunction('due'),

  'UID': generateSimpleParamFunction('uid'),
  'SUMMARY': generateSimpleParamFunction('name'),
  'DESCRIPTION': generateSimpleParamFunction('description'),
  'LOCATION': generateSimpleParamFunction('location'),
  'URL': generateSimpleParamFunction('url'),

  'ORGANIZER': function objectOrganizer(value: string, params: any, events: Event[], lastEvent: Event) {
    const mail = value.replace(/MAILTO:/i, '');

    if (params.CN) {
      lastEvent.organizer = {
        name: params.CN,
        mail: mail,
      };
    } else {
      lastEvent.organizer = {
        mail: mail,
      };
    }
    return lastEvent;
  },

  'GEO': function objectGeo(value: string, params: any, events: Event[], lastEvent: Event) {
    const pos = value.split(';');
    if (pos.length !== 2) {
      return lastEvent;
    }

    lastEvent.geo = {
      latitude: Number(pos[0]),
      longitude: Number(pos[1]),
    };
    return lastEvent;
  },

  'CATEGORIES': function objectCategories(value: string, params: any, events: Event[], lastEvent: Event) {
    lastEvent.categories = value.split(/\s*,\s*/g);
    return lastEvent;
  },

  'ATTENDEE': function objectAttendee(value: string, params: any, events: Event[], lastEvent: Event) {
    if (!lastEvent.attendee) {
      lastEvent.attendee = [];
    }

    const mail = value.replace(/MAILTO:/i, '');

    if (params.CN) {
      lastEvent.attendee.push({
        name: params.CN,
        mail: mail,
      });
    } else {
      lastEvent.attendee.push({
        mail: mail,
      });
    }
    return lastEvent;
  },
};

export default function parseICS(str: string) {
  const data: Event[] = [];

  const events: Event[] = [];
  let lastEvent: Event = {} as Event;

  const lines = str.split('\n');

  for (let i = 0, len = lines.length; i < len; i += 1) {
    let line = lines[i].trim();

    while (i + 1 < len && lines[i + 1].match(/^ /)) {
      i += 1;
      line += lines[i].trim();
    }

    const dataLine = line.split(':');
    if (dataLine.length < 2) {
      continue;
    }

    const dataName = dataLine[0].split(';');

    const name = dataName[0];
    dataName.splice(0, 1);

    const params: any = {};
    dataName.forEach((param) => {
      const splitParam = param.split('=');
      if (splitParam.length === 2) {
          params[splitParam[0]] = splitParam[1];
      }
      if (param.length === 2) {
        params[param[0]] = param[1];
      }
    });

    dataLine.splice(0, 1);
    const value = dataLine.join(':').replace('\\,', ',');
    if (objects[name]) {
      lastEvent = objects[name](value, params, events, lastEvent, data);
    }
  }

  return data;
}
