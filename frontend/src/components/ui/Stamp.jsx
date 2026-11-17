import React from 'react';

const VARIANT_CLASSES = {
  mastered: '',
  new: 'stamp--new',
  live: 'stamp--live',
  locked: 'stamp--locked',
  ended: 'stamp--ended',
  unlocked: 'stamp--unlocked',
};

/**
 * Ink stamp indicator for completion, mastery, new items, live/ended classes, or lock states.
 */
export default function Stamp({
  variant = 'mastered',
  animate = false,
  className = '',
  children,
  ...props
}) {
  const shouldAnimate = animate && variant !== 'live';
  const classes = [
    'stamp',
    VARIANT_CLASSES[variant] || '',
    shouldAnimate ? 'stamp--animate' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
