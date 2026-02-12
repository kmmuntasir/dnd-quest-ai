import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DiceRoller } from '../../../src/components/game/DiceRoller';

describe('DiceRoller', () => {
  let mockOnRoll;

  beforeEach(() => {
    mockOnRoll = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render the roll button', () => {
    render(<DiceRoller onRoll={mockOnRoll} />);
    expect(screen.getByRole('button', { name: /roll d20/i })).toBeInTheDocument();
  });

  it('should render initial dice value', () => {
    render(<DiceRoller onRoll={mockOnRoll} />);
    // There are two elements with dice value (dice face and last roll display)
    const diceValues = screen.getAllByText('1');
    expect(diceValues.length).toBeGreaterThanOrEqual(1);
  });

  it('should call onRoll when dice is rolled', async () => {
    render(<DiceRoller onRoll={mockOnRoll} />);

    // Click roll button
    fireEvent.click(screen.getByRole('button'));

    // Fast-forward through animation
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockOnRoll).toHaveBeenCalledTimes(1);
    expect(mockOnRoll).toHaveBeenCalledWith(expect.any(Number));
  });

  it('should disable button when rolling', async () => {
    render(<DiceRoller onRoll={mockOnRoll} />);

    // Click roll button
    fireEvent.click(screen.getByRole('button'));

    // Button should be disabled during rolling
    expect(screen.getByRole('button')).toBeDisabled();

    // Fast-forward through animation
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Button should be enabled again
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('should not roll when disabled prop is true', () => {
    render(<DiceRoller onRoll={mockOnRoll} disabled />);

    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.click(screen.getByRole('button'));

    expect(mockOnRoll).not.toHaveBeenCalled();
  });

  it('should show rolling state text', async () => {
    render(<DiceRoller onRoll={mockOnRoll} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText(/rolling/i)).toBeInTheDocument();

    // Fast-forward through animation
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText(/rolling/i)).not.toBeInTheDocument();
  });

  it('should display last roll after rolling', async () => {
    render(<DiceRoller onRoll={mockOnRoll} />);

    // Initially shows "Last Roll" text
    expect(screen.getByText(/last roll/i)).toBeInTheDocument();

    // Click roll
    fireEvent.click(screen.getByRole('button'));

    // Fast-forward through animation
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Should still show last roll
    expect(screen.getByText(/last roll/i)).toBeInTheDocument();
  });

  it('should generate dice value between 1 and 20', async () => {
    render(<DiceRoller onRoll={mockOnRoll} />);

    // Roll multiple times and check bounds
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole('button'));

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      const lastCall = mockOnRoll.mock.calls[mockOnRoll.mock.calls.length - 1];
      expect(lastCall[0]).toBeGreaterThanOrEqual(1);
      expect(lastCall[0]).toBeLessThanOrEqual(20);
    }
  });

  it('should not start new roll while rolling', async () => {
    render(<DiceRoller onRoll={mockOnRoll} />);

    // Click roll button twice quickly
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));

    // Fast-forward through animation
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Should only call onRoll once
    expect(mockOnRoll).toHaveBeenCalledTimes(1);
  });

  it('should handle cleanup on unmount', async () => {
    const { unmount } = render(<DiceRoller onRoll={mockOnRoll} />);

    // Start rolling
    fireEvent.click(screen.getByRole('button'));

    // Unmount before animation completes
    unmount();

    // Advance timers - should not throw or call onRoll after unmount
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // onRoll should not have been called since we unmounted
    expect(mockOnRoll).not.toHaveBeenCalled();
  });
});
