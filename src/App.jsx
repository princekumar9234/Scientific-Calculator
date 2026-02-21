import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { create, all } from 'mathjs';

const math = create(all);

const App = () => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [isScientific, setIsScientific] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [angleMode, setAngleMode] = useState('deg'); // 'deg' or 'rad'
  const [history, setHistory] = useState([]);
  const [isError, setIsError] = useState(false);

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const calculate = useCallback((expr, currentAngleMode) => {
    try {
      let evalExpression = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'pi');

      const scope = {
        sin: (x) => currentAngleMode === 'deg' ? math.sin(math.unit(x, 'deg')) : math.sin(x),
        cos: (x) => currentAngleMode === 'deg' ? math.cos(math.unit(x, 'deg')) : math.cos(x),
        tan: (x) => currentAngleMode === 'deg' ? math.tan(math.unit(x, 'deg')) : math.tan(x),
        asin: (x) => currentAngleMode === 'deg' ? math.unit(math.asin(x), 'rad').to('deg').toNumber() : math.asin(x),
        acos: (x) => currentAngleMode === 'deg' ? math.unit(math.acos(x), 'rad').to('deg').toNumber() : math.acos(x),
        atan: (x) => currentAngleMode === 'deg' ? math.unit(math.atan(x), 'rad').to('deg').toNumber() : math.atan(x),
      };

      const result = math.evaluate(evalExpression, scope);
      
      // Handle complex numbers or objects (get real part if simple)
      let numericResult = typeof result === 'object' && result.isComplex ? result.re : result;
      
      // Format with tolerance for floating point errors (e.g. sin(180) -> 0)
      if (typeof numericResult === 'number') {
        if (Math.abs(numericResult) < 1e-12) numericResult = 0;
        if (Math.abs(numericResult - 1) < 1e-12) numericResult = 1;
        if (Math.abs(numericResult + 1) < 1e-12) numericResult = -1;
      }

      const formattedResult = Number.isFinite(numericResult) 
        ? Number(parseFloat(numericResult.toFixed(10))) 
        : String(numericResult);

      return String(formattedResult);
    } catch (error) {
      return 'Error';
    }
  }, []);

  const handleAction = useCallback((btn) => {
    setIsError(false);
    
    if (btn.action === 'append') {
      if (display === '0' || display === 'Error') {
        setDisplay(btn.val);
      } else {
        setDisplay(prev => prev + btn.val);
      }
    } else if (btn.action === 'clear') {
      setDisplay('0');
      setExpression('');
    } else if (btn.action === 'delete') {
      if (display.length > 1 && display !== 'Error') {
        setDisplay(prev => prev.slice(0, -1));
      } else {
        setDisplay('0');
      }
    } else if (btn.action === 'calculate') {
      const res = calculate(display, angleMode);
      if (res === 'Error') {
        setIsError(true);
        setDisplay('Error');
      } else {
        setHistory(prev => [{ exp: display, res }, ...prev].slice(0, 10));
        setExpression(display + ' =');
        setDisplay(res);
      }
    }
  }, [display, angleMode, calculate]);

  // Re-calculate when mode changes if equals was just used or there's an expression
  useEffect(() => {
    if (expression.includes('=') && display !== 'Error') {
      const originalExpression = expression.split(' =')[0];
      const res = calculate(originalExpression, angleMode);
      if (res !== 'Error') {
        setDisplay(res);
      }
    }
  }, [angleMode, expression, calculate]);

  // Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') handleAction({ action: 'append', val: e.key });
      if (['+', '-', '*', '/'].includes(e.key)) handleAction({ action: 'append', val: e.key === '*' ? '×' : e.key === '/' ? '÷' : e.key });
      if (e.key === '.') handleAction({ action: 'append', val: '.' });
      if (e.key === 'Enter' || e.key === '=') handleAction({ action: 'calculate' });
      if (e.key === 'Backspace') handleAction({ action: 'delete' });
      if (e.key === 'Escape') handleAction({ action: 'clear' });
      if (e.key === '(' || e.key === ')') handleAction({ action: 'append', val: e.key });
      if (e.key === '^') handleAction({ action: 'append', val: '^' });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction]);

  const buttons = [
    { label: 'AC', action: 'clear', type: 'clear' },
    { label: '⌫', action: 'delete', type: 'special' },
    { label: '%', action: 'append', val: '%', type: 'special' },
    { label: '÷', action: 'append', val: '÷', type: 'operator' },

    { label: '7', action: 'append', val: '7' },
    { label: '8', action: 'append', val: '8' },
    { label: '9', action: 'append', val: '9' },
    { label: '×', action: 'append', val: '×', type: 'operator' },

    { label: '4', action: 'append', val: '4' },
    { label: '5', action: 'append', val: '5' },
    { label: '6', action: 'append', val: '6' },
    { label: '−', action: 'append', val: '-', type: 'operator' },

    { label: '1', action: 'append', val: '1' },
    { label: '2', action: 'append', val: '2' },
    { label: '3', action: 'append', val: '3' },
    { label: '+', action: 'append', val: '+', type: 'operator' },

    { label: '0', action: 'append', val: '0', className: 'btn-wide' },
    { label: '.', action: 'append', val: '.' },
    { label: '=', action: 'calculate', type: 'equal' },
  ];

  const sciButtons = [
    { label: 'sin', action: 'append', val: 'sin(', type: 'special' },
    { label: 'cos', action: 'append', val: 'cos(', type: 'special' },
    { label: 'tan', action: 'append', val: 'tan(', type: 'special' },
    { label: 'log', action: 'append', val: 'log10(', type: 'special' },
    { label: 'ln', action: 'append', val: 'log(', type: 'special' },
    { label: '√', action: 'append', val: 'sqrt(', type: 'special' },
    { label: 'π', action: 'append', val: 'π', type: 'special' },
    { label: 'e', action: 'append', val: 'e', type: 'special' },
    { label: '^', action: 'append', val: '^', type: 'special' },
    { label: '!', action: 'append', val: '!', type: 'special' },
  ];

  return (
    <div className="calculator-container">
      {/* History Panel */}
      <motion.div 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="history-panel"
      >
        <div className="history-header">
          History
          <span className="clear-history" onClick={() => setHistory([])}>Clear</span>
        </div>
        <div className="history-list">
          {history.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
              No history yet
            </div>
          ) : (
            history.map((item, i) => (
              <div key={i} className="history-item" onClick={() => setDisplay(item.res)}>
                <span className="hist-exp">{item.exp}</span>
                <span className="hist-res">{item.res}</span>
              </div>
            ))
          )}
        </div>
      </motion.div>

      <motion.div 
        layout
        className={`calculator-body ${isScientific ? 'scientific-active' : ''}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="top-controls" style={{ justifyContent: 'center', marginBottom: '10px' }}>
          <div className="control-pill">
            <div className={`pill-item ${!isScientific ? 'active' : ''}`} onClick={() => setIsScientific(false)}>STANDARD</div>
            <div className={`pill-item ${isScientific ? 'active' : ''}`} onClick={() => setIsScientific(true)}>SCIENTIFIC</div>
          </div>
        </div>

        <div className="top-controls">
          {isScientific && (
            <div className="control-pill">
              <div className={`pill-item ${angleMode === 'deg' ? 'active' : ''}`} onClick={() => setAngleMode('deg')}>DEG</div>
              <div className={`pill-item ${angleMode === 'rad' ? 'active' : ''}`} onClick={() => setAngleMode('rad')}>RAD</div>
            </div>
          )}

          <div className="control-pill" style={{ marginLeft: 'auto' }} onClick={() => setIsDarkMode(!isDarkMode)}>
            <div className="pill-item">{isDarkMode ? '🌙 DARK' : '☀️ LIGHT'}</div>
          </div>
        </div>

        <div className="screen">
          <div className="expression-display">{expression}</div>
          <AnimatePresence mode="wait">
            <motion.div 
              key={display}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`result-display ${isError ? 'error-text' : ''}`}
              style={{ color: isError ? 'var(--accent-error)' : 'var(--text-primary)' }}
            >
              {display}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="button-grid">
          {isScientific && sciButtons.map((btn, i) => (
            <motion.button 
              key={`sci-${i}`} 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`calc-btn btn-${btn.type || ''}`} 
              onClick={() => handleAction(btn)}
            >
              {btn.label}
            </motion.button>
          ))}
          {buttons.map((btn, i) => (
            <motion.button 
              key={`basic-${i}`} 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`calc-btn btn-${btn.type || ''} ${btn.className || ''}`} 
              onClick={() => handleAction(btn)}
            >
              {btn.label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default App;
