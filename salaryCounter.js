import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

export default function SalaryCounter() {
  // Each day: 0=Sunday,1=Monday,2=Tuesday,3=Wednesday,4=Thursday,5=Friday,6=Saturday
  // default to Mon-Fri on, Sat & Sun off
  const [dayToggles, setDayToggles] = useState({
    0: false,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: false,
  });

  const [annualSalary, setAnnualSalary] = useState(30000);
  const [earnedSoFar, setEarnedSoFar] = useState(0);
  const [startHour, setStartHour] = useState(10);
  const [endHour, setEndHour] = useState(18);

  // currency options: $, £, €, ¥
  const [currency, setCurrency] = useState('£');

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

  useEffect(() => {
    // Recalculate every second
    const interval = setInterval(() => {
      setEarnedSoFar(calculateEarnings(annualSalary));
    }, 1000);

    return () => clearInterval(interval);
  }, [annualSalary, startHour, endHour, dayToggles, currency]);

  // Helper function: checks if a given date is toggled on in dayToggles
  function isDayEnabled(date) {
    const day = date.getDay(); // 0=Sunday, 1=Monday, etc.
    return !!dayToggles[day]; // if toggled on
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

  // Calculates how much we've earned so far this month
  function calculateEarnings(annual) {
    const monthly = annual / 12;
    const totalWorkingHours = getTotalWorkingHoursThisMonth();
    const elapsedHours = getWorkingHoursSoFarThisMonth();
    // safeguard if totalWorkingHours is 0
    if (totalWorkingHours === 0) return 0;

    const fraction = Math.max(0, Math.min(1, elapsedHours / totalWorkingHours));
    return monthly * fraction;
  }

  // format currency using the chosen symbol in the UI
  function formatCurrency(amount) {
    const c = currencyMap[currency];
    // We'll keep 2 decimals max for the main display
    return amount.toLocaleString(c.locale, {
      style: 'currency',
      currency: c.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

  // We'll calculate the per-second earnings within work hours.
  const totalWorkHours = getTotalWorkingHoursThisMonth();
  const totalWorkSeconds = totalWorkHours * 3600;
  let earnedPerSecond = 0;
  if (totalWorkSeconds > 0) {
    earnedPerSecond = monthlySalaryRaw / totalWorkSeconds;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="shadow-lg p-4 rounded-2xl">
          <CardContent>
            <div className="mb-4">
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
                Earned per second (within work hours): £{earnedPerSecond.toFixed(4)}
              </p>
            </div>
            <div className="flex gap-4 mb-4">
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
            <div className="mb-4 grid grid-cols-7 gap-2">
              {dayLabels.map((label, idx) => (
                <div key={label} className="flex flex-col items-center">
                  <Label className="text-sm mb-1">{label}</Label>
                  <input
                    type="checkbox"
                    checked={dayToggles[idx]}
                    onChange={() => handleDayToggle(idx)}
                  />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md">
              <h2 className="text-xl font-bold mb-2">Earnings So Far In {currentMonthName}</h2>
              <p className="text-3xl font-semibold">{formatCurrency(earnedSoFar)}</p>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Earnings increase only in work hours.</p>
              <p>You are {percentComplete}% though the month.</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
