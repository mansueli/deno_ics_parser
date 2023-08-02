import fs from 'fs';
import path from 'path';
import parseICS from '../ics_parser.ts';

describe('parseICS', () => {
  let icsString: string;

  beforeAll(done => {
    fs.readFile(path.join(__dirname, './test/samples/invite.ics'), 'utf8', (err, data) => {
      if (err) throw err;
      icsString = data;
      done();
    });
  });

  test('should correctly parse valid ICS string', () => {
    const result = parseICS(icsString);

    // Insert assertions here to check if result is as expected
    // For example, if you expect the first event to have a certain name:
    expect(result[0].summary).toEqual('Dyncon 2011');
    expect(result[0].location).toEqual('Stockholm, Sweden');
    expect(result[0].start).toEqual(new Date('2011-03-12T20:00:00Z'));
    // Continue for all properties and other events
  });

  test('should return empty array for empty ICS string', () => {
    const result = parseICS('');
    expect(result).toEqual([]);
  });

  test('should throw error for invalid date in ICS string', () => {
    const invalidDateICS = icsString.replace('DTSTART;VALUE=DATE:20110502', 'DTSTART;VALUE=DATE:Next Year');
    expect(() => parseICS(invalidDateICS)).toThrow();
  });
});
