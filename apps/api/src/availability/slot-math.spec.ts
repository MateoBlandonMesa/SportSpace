import { describe, expect, it } from '@jest/globals';
import { buildSlots, overlaps } from './slot-math';

describe('slot-math', () => {
  it('genera espacios horarios de una hora', () => {
    const slots = buildSlots('2026-10-23', '09:00', '11:00');

    expect(slots).toHaveLength(2);
    expect(slots[0].endsAt.getTime() - slots[0].startsAt.getTime()).toBe(
      60 * 60 * 1000,
    );
  });

  it('detecta cuando una reserva se cruza con un espacio horario', () => {
    const slots = buildSlots('2026-10-23', '09:00', '10:00');

    expect(
      overlaps(
        slots[0],
        new Date('2026-10-23T09:30:00-05:00'),
        new Date('2026-10-23T10:30:00-05:00'),
      ),
    ).toBe(true);
  });

  it('no considera cruzados dos intervalos consecutivos', () => {
    const slots = buildSlots('2026-10-23', '09:00', '10:00');

    expect(
      overlaps(
        slots[0],
        new Date('2026-10-23T10:00:00-05:00'),
        new Date('2026-10-23T11:00:00-05:00'),
      ),
    ).toBe(false);
  });
});