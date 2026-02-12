import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from '../../../src/components/ui/ToastContext';

// Test component that uses the toast hook
function TestComponent({ toastMethod, message }) {
  const toast = useToast();

  const handleClick = () => {
    if (toastMethod === 'success') toast.success(message);
    else if (toastMethod === 'error') toast.error(message);
    else if (toastMethod === 'info') toast.info(message);
    else if (toastMethod === 'warning') toast.warning(message);
  };

  return <button onClick={handleClick}>Show Toast</button>;
}

describe('ToastProvider and useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should throw error when useToast is used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    function ComponentOutsideProvider() {
      useToast();
      return null;
    }

    expect(() => render(<ComponentOutsideProvider />)).toThrow(
      'useToast must be used within a ToastProvider'
    );

    consoleError.mockRestore();
  });

  it('should provide toast context to children', () => {
    render(
      <ToastProvider>
        <div>Child content</div>
      </ToastProvider>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should show success toast', async () => {
    render(
      <ToastProvider>
        <TestComponent toastMethod="success" message="Success message" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('should show error toast', async () => {
    render(
      <ToastProvider>
        <TestComponent toastMethod="error" message="Error message" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should show info toast', async () => {
    render(
      <ToastProvider>
        <TestComponent toastMethod="info" message="Info message" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('should show warning toast', async () => {
    render(
      <ToastProvider>
        <TestComponent toastMethod="warning" message="Warning message" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('should auto-dismiss toast after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent toastMethod="info" message="Auto dismiss" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    // Wait for default duration (5000ms)
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
  });

  it('should allow manual dismiss via dismiss method', async () => {
    function DismissComponent() {
      const toast = useToast();

      const handleShow = () => {
        // Store ID in a way that persists
        window.__testToastId = toast.info('Manual dismiss');
      };

      const handleDismiss = () => {
        toast.dismiss(window.__testToastId);
      };

      return (
        <>
          <button onClick={handleShow}>Show</button>
          <button onClick={handleDismiss}>Dismiss</button>
        </>
      );
    }

    render(
      <ToastProvider>
        <DismissComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show'));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText('Manual dismiss')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Dismiss'));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByText('Manual dismiss')).not.toBeInTheDocument();

    // Cleanup
    delete window.__testToastId;
  });

  it('should dismiss toast when close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent toastMethod="info" message="Closable toast" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText('Closable toast')).toBeInTheDocument();

    // Click the close button (X icon)
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn => btn.querySelector('svg'));

    fireEvent.click(closeButton);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByText('Closable toast')).not.toBeInTheDocument();
  });

  it('should show multiple toasts', async () => {
    function MultiToastComponent() {
      const toast = useToast();

      const handleClick = () => {
        toast.success('First toast');
        toast.error('Second toast');
      };

      return <button onClick={handleClick}>Show Multiple</button>;
    }

    render(
      <ToastProvider>
        <MultiToastComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Multiple'));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });
});
