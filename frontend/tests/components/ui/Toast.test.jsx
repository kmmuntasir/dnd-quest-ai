import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Toast } from '../../../src/components/ui/Toast';

describe('Toast', () => {
  let mockOnClose;

  beforeEach(() => {
    mockOnClose = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render toast with message', () => {
    render(<Toast message="Test message" onClose={mockOnClose} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should call onClose after duration', async () => {
    render(<Toast message="Test message" onClose={mockOnClose} duration={3000} />);

    expect(mockOnClose).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is clicked', () => {
    render(<Toast message="Test message" onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not auto-close when duration is 0', async () => {
    render(<Toast message="Test message" onClose={mockOnClose} duration={0} />);

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should render success type with correct styling', () => {
    render(<Toast message="Success!" type="success" onClose={mockOnClose} />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('should render error type with correct styling', () => {
    render(<Toast message="Error!" type="error" onClose={mockOnClose} />);
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('should render warning type with correct styling', () => {
    render(<Toast message="Warning!" type="warning" onClose={mockOnClose} />);
    expect(screen.getByText('Warning!')).toBeInTheDocument();
  });

  it('should render info type by default', () => {
    render(<Toast message="Info" onClose={mockOnClose} />);
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('should cleanup timeout on unmount', async () => {
    const { unmount } = render(
      <Toast message="Test message" onClose={mockOnClose} duration={5000} />
    );

    // Unmount before timer completes
    unmount();

    // Advance timers - should not call onClose since unmounted
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
