import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalaryCounter from './SalaryCounter';

describe('SalaryCounter', () => {
  test('Initial annual salary is 30000', () => {
    render(<SalaryCounter />);
    const salaryInput = screen.getByLabelText(/Annual Salary/i);
    expect(salaryInput.value).toBe('30000');
  });

  test('Updating the salary input changes the displayed value', async () => {
    render(<SalaryCounter />);
    const salaryInput = screen.getByLabelText(/Annual Salary/i);
    await userEvent.clear(salaryInput);
    await userEvent.type(salaryInput, '50000');
    expect(salaryInput.value).toBe('50000');
  });

  test('Start hour and end hour can be updated', async () => {
    render(<SalaryCounter />);
    const startHourInput = screen.getByLabelText(/Start Hour/i);
    const endHourInput = screen.getByLabelText(/End Hour/i);
    await userEvent.clear(startHourInput);
    await userEvent.type(startHourInput, '9');
    expect(startHourInput.value).toBe('9');
    await userEvent.clear(endHourInput);
    await userEvent.type(endHourInput, '17');
    expect(endHourInput.value).toBe('17');
  });

  test('Toggle days on/off', async () => {
    render(<SalaryCounter />);
    const sunCheckbox = screen.getByRole('checkbox', { name: 'Sun' });
    const monCheckbox = screen.getByRole('checkbox', { name: 'Mon' });

    // By default, Sun is off, Mon is on
    expect(sunCheckbox.checked).toBe(false);
    expect(monCheckbox.checked).toBe(true);

    // Toggle Sunday ON
    await userEvent.click(sunCheckbox);
    expect(sunCheckbox.checked).toBe(true);
    // Toggle Monday OFF
    await userEvent.click(monCheckbox);
    expect(monCheckbox.checked).toBe(false);
  });
}); 