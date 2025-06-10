import React, { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { motion } from "framer-motion";
import { Calendar, Clock } from "lucide-react";

export default function SalaryCounter() {
  // Each day: 0=Sunday,1=Monday,2=Tuesday,3=Wednesday,4=Thursday,5=Friday,6=Saturday
  // default to Mon-Fri on, Sat & Sun off
  const [dayToggles, setDayToggles] = useLocalStorage('salary-counter-day-toggles', {
    0: false,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: false,
  });

  const [annualSalary, setAnnualSalary] = useLocalStorage('salary-counter-annual-salary', 30000);
  const [startHour, setStartHour] = useLocalStorage('salary-counter-start-hour', 10);
  const [endHour, setEndHour] = useLocalStorage('salary-counter-end-hour', 18);
  const [currency, setCurrency] = useLocalStorage('salary-counter-currency', '£');

  // These values are calculated and don't need to be persisted
  const [earnedSoFar, setEarnedSoFar] = useState(0);
  const [earnedToday, setEarnedToday] = useState(0);

  // We'll keep a map of currency => locale + code
  // Use English-based locales for all, so we always get something like 7,826.09
  const currencyMap = {
    '$': { locale: 'en-US', code: 'USD' },
    '£': { locale: 'en-GB', code: 'GBP' },
    '€': { locale: 'en-GB', code: 'EUR' },
    '¥': { locale: 'ja-JP', code: 'JPY' },
  };

  // For displaying month names in the heading
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calculates how much we've earned so far today
  const calculateDailyEarnings = useCallback((annual) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if today is a working day
    if (!isDayEnabled(today)) {
      return 0;
    }

    // Calculate daily rate based on working days in a year
    // Assuming we work the same schedule throughout the year
    const totalWorkingDaysPerYear = getTotalWorkingDaysPerYear();
    const dailyRate = totalWorkingDaysPerYear > 0 ? annual / totalWorkingDaysPerYear : 0;

    const totalDailyWorkingHours = getDailyWorkingHours();
    const elapsedHours = getWorkingHoursSoFarToday();

    // safeguard if totalDailyWorkingHours is 0
    if (totalDailyWorkingHours === 0) return 0;

    const fraction = Math.max(0, Math.min(1, elapsedHours / totalDailyWorkingHours));
    return dailyRate * fraction;
  }, [dayToggles, startHour, endHour]);

  // Calculates how much we've earned so far this month
  const calculateEarnings = useCallback((annual) => {
    const monthly = annual / 12;
    const totalWorkingHours = getTotalWorkingHoursThisMonth();
    const elapsedHours = getWorkingHoursSoFarThisMonth();
    // safeguard if totalWorkingHours is 0
    if (totalWorkingHours === 0) return 0;

    const fraction = Math.max(0, Math.min(1, elapsedHours / totalWorkingHours));
    return monthly * fraction;
  }, [dayToggles, startHour, endHour]);

  useEffect(() => {
    // Recalculate every second
    const interval = setInterval(() => {
      setEarnedSoFar(calculateEarnings(annualSalary));
      setEarnedToday(calculateDailyEarnings(annualSalary));
    }, 50);

    return () => clearInterval(interval);
  }, [annualSalary, startHour, endHour, dayToggles, currency, calculateEarnings, calculateDailyEarnings]);

  // Helper function: checks if a given date is toggled on in dayToggles
  function isDayEnabled(date) {
    const day = date.getDay(); // 0=Sunday, 1=Monday, etc.
    return !!dayToggles[day]; // if toggled on
  }

  // Helper function: get how many working hours have elapsed so far today
  function getWorkingHoursSoFarToday() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if today is a working day
    if (!isDayEnabled(today)) {
      return 0;
    }

    const startOfWork = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, 0, 0);
    const endOfWork = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, 0, 0);

    if (now < startOfWork) {
      // Before workday starts
      return 0;
    } else if (now > endOfWork) {
      // After workday ends
      return endHour - startHour;
    } else {
      // Part of the workday has passed
      const msSinceStart = now - startOfWork;
      const hoursSinceStart = msSinceStart / 1000 / 3600;
      return hoursSinceStart;
    }
  }

  // Helper function: total working hours in a single day
  function getDailyWorkingHours() {
    return endHour - startHour;
  }

  // Helper function: get how many working hours have elapsed so far in the current month
  function getWorkingHoursSoFarThisMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let totalHours = 0;

    for (let day = 1; day <= now.getDate(); day++) {
      const currentDayDate = new Date(year, month, day);
      // If the day is toggled off, skip it
      if (!isDayEnabled(currentDayDate)) {
        continue;
      }

      // daily working hours are (endHour - startHour)
      const dailyHours = endHour - startHour;

      if (day < now.getDate()) {
        // Entire day's work hours have passed
        totalHours += dailyHours;
      } else if (day === now.getDate()) {
        // Count only up to current time
        const startOfWork = new Date(year, month, day, startHour, 0, 0);
        const endOfWork = new Date(year, month, day, endHour, 0, 0);
        if (now < startOfWork) {
          // Before workday starts
        } else if (now > endOfWork) {
          // After workday ends
          totalHours += dailyHours;
        } else {
          // Part of the workday has passed
          const msSinceStart = now - startOfWork;
          const hoursSinceStart = msSinceStart / 1000 / 3600;
          totalHours += hoursSinceStart;
        }
      }
    }

    return totalHours;
  }

  // Helper function: total working hours in the current month
  function getTotalWorkingHoursThisMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Start of next month
    const startOfNextMonth = new Date(year, month + 1, 1);
    // Last day of this month
    const lastDayOfMonth = new Date(startOfNextMonth - 1);
    const daysInMonth = lastDayOfMonth.getDate();
    let workingHours = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDate = new Date(year, month, day);
      if (isDayEnabled(currentDayDate)) {
        workingHours += endHour - startHour;
      }
    }

    return workingHours;
  }

  // Helper function: calculate total working days per year based on current schedule
  function getTotalWorkingDaysPerYear() {
    let workingDays = 0;
    // Count working days per week
    for (let day = 0; day < 7; day++) {
      if (dayToggles[day]) {
        workingDays++;
      }
    }
    // Multiply by 52 weeks (approximately)
    return workingDays * 52;
  }

  // format currency using the chosen symbol in the UI
  function formatCurrency(amount) {
    const c = currencyMap[currency];

    // Get the main amount with 2 decimal places
    const mainAmount = amount.toLocaleString(c.locale, {
      style: 'currency',
      currency: c.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Calculate the 3rd decimal digit
    const scaledAmount = Math.round(amount * 1000);
    const thirdDecimal = scaledAmount % 10;

    return (
      <span className="font-mono">
        {mainAmount}
        <span className="text-sm text-gray-100 font-normal ml-0.5">.{thirdDecimal}</span>
      </span>
    );
  }

  // format monthly salary with 0 decimals for help text, if desired
  function formatMonthly(amount) {
    const c = currencyMap[currency];
    return amount.toLocaleString(c.locale, {
      style: 'currency',
      currency: c.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  const handleSalaryChange = (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) {
      val = 0;
    }
    setAnnualSalary(val);
  };

  const handleStartHourChange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) {
      val = 0;
    }
    setStartHour(val);
  };

  const handleEndHourChange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) {
      val = 0;
    }
    setEndHour(val);
  };

  const handleCurrencyChange = (e) => {
    setCurrency(e.target.value);
  };

  // Toggle function for dayToggles
  const handleDayToggle = (dayIndex) => {
    setDayToggles((prev) => ({
      ...prev,
      [dayIndex]: !prev[dayIndex],
    }));
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // We'll calculate the monthly salary for the help text with thousands formatting.
  const monthlySalaryRaw = annualSalary / 12;
  const monthlySalaryDisplay = formatMonthly(monthlySalaryRaw);

  // We'll figure out the percent of the month completed.
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentMonthName = monthNames[currentMonth];
  const currentYear = now.getFullYear();
  // compute how many days in month
  const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
  const lastDayOfMonth = new Date(startOfNextMonth - 1);
  const daysInMonth = lastDayOfMonth.getDate();
  const dayOfMonth = now.getDate();
  const percentComplete = ((dayOfMonth / daysInMonth) * 100).toFixed(1);

  // Calculate today's progress percentage
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let todayPercentComplete = 0;
  if (isDayEnabled(today)) {
    const totalDailyHours = getDailyWorkingHours();
    const elapsedTodayHours = getWorkingHoursSoFarToday();
    if (totalDailyHours > 0) {
      todayPercentComplete = ((elapsedTodayHours / totalDailyHours) * 100).toFixed(1);
    }
  }

  // Check if we're currently in work hours
  const isCurrentlyInWorkHours = () => {
    if (!isDayEnabled(today)) {
      return false; // Not a working day
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInHours = currentHour + (currentMinute / 60);

    return currentTimeInHours >= startHour && currentTimeInHours < endHour;
  };

  // We'll calculate the per-second earnings within work hours.
  const totalWorkHours = getTotalWorkingHoursThisMonth();
  const totalWorkSeconds = totalWorkHours * 3600;
  let earnedPerSecond = 0;
  if (totalWorkSeconds > 0) {
    earnedPerSecond = monthlySalaryRaw / totalWorkSeconds;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="shadow-lg p-4 rounded-2xl bg-white">
          <CardContent>
            <Accordion type="single" collapsible={true} className="mb-6">
              <AccordionItem value="config">
                <AccordionTrigger className="text-lg font-semibold">
                  Configuration
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="salary" className="text-lg font-semibold mb-2 block">
                        Annual Salary
                      </Label>
                      <Input
                        id="salary"
                        type="number"
                        value={annualSalary}
                        onChange={handleSalaryChange}
                        className="w-full"
                      />
                      <div className="flex gap-2 items-center mt-2">
                        <p className="text-sm text-gray-600">Currency:</p>
                        <select
                          value={currency}
                          onChange={handleCurrencyChange}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="$">$</option>
                          <option value="£">£</option>
                          <option value="€">€</option>
                          <option value="¥">¥</option>
                        </select>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Monthly Salary: {monthlySalaryDisplay}
                      </p>
                      <p className="text-sm text-gray-600">
                        Earned per second (within work hours): {currency}{earnedPerSecond.toFixed(4)}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Label htmlFor="startHour" className="text-lg font-semibold mb-2 block">
                          Start Hour
                        </Label>
                        <Input
                          id="startHour"
                          type="number"
                          min="0"
                          max="23"
                          value={startHour}
                          onChange={handleStartHourChange}
                          className="w-full"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="endHour" className="text-lg font-semibold mb-2 block">
                          End Hour
                        </Label>
                        <Input
                          id="endHour"
                          type="number"
                          min="0"
                          max="23"
                          value={endHour}
                          onChange={handleEndHourChange}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-lg font-semibold mb-2 block">Working Days</Label>
                      <div className="grid grid-cols-7 gap-2">
                        {dayLabels.map((label, idx) => (
                          <div key={label} className="flex flex-col items-center">
                            <Label htmlFor={`day-${idx}`} className="text-sm mb-1">{label}</Label>
                            <input
                              id={`day-${idx}`}
                              type="checkbox"
                              checked={dayToggles[idx]}
                              onChange={() => handleDayToggle(idx)}
                              aria-label={label}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-6 h-6" />
                <h2 className="text-xl font-bold">Earnings in {currentMonthName}</h2>
              </div>
              <p className="text-4xl font-semibold">{formatCurrency(earnedSoFar)}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg text-white mt-4">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6" />
                <h2 className="text-xl font-bold">Earnings Today</h2>
              </div>
              <p className="text-4xl font-semibold">{formatCurrency(earnedToday)}</p>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {!isCurrentlyInWorkHours() && (
                <p>Earnings increase only in work hours.</p>
              )}

              {/* Month Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span>Progress - {currentMonthName}</span>
                  <span className="font-medium">{percentComplete}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentComplete}%` }}
                  ></div>
                </div>
              </div>

              {/* Today Progress Bar */}
              <div className="mt-3">
                {isDayEnabled(today) ? (
                  <>
                    <div className="flex justify-between items-center mb-1">
                      <span>Progress - Today</span>
                      <span className="font-medium">{todayPercentComplete}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${todayPercentComplete}%` }}
                      ></div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-2 text-gray-500">
                    Today is not a working day.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// TEST CASES (Jest + React Testing Library)
// Because this code is a single file component, you can place this in a separate file named
// "SalaryCounter.test.js" in the same directory if you'd like to run automated tests.

/*
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalaryCounter from './SalaryCounter';

describe('SalaryCounter', () => {
  test('Initial annual salary is 120000', () => {
    render(<SalaryCounter />);
    const salaryInput = screen.getByLabelText(/Annual Salary/i);
    expect(salaryInput.value).toBe('120000');
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

  // New test for toggling days
  test('Toggle days on/off', async () => {
    render(<SalaryCounter />);
    const sunCheckbox = screen.getByLabelText('Sun');
    const monCheckbox = screen.getByLabelText('Mon');

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
*/
