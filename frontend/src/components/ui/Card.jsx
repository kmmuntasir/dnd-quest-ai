import { clsx } from 'clsx';
import PropTypes from 'prop-types';

export function Card({ children, className = '', hover = false, ...props }) {
  const baseStyles = 'bg-background-card rounded-xl border border-background-input';
  const hoverStyles = hover ? 'hover:border-background-input/50 hover:shadow-lg transition-all' : '';

  const classes = clsx(baseStyles, hoverStyles, className);

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  hover: PropTypes.bool
};

Card.defaultProps = {
  className: '',
  hover: false
};

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`p-6 border-b border-background-input ${className}`}>
      {children}
    </div>
  );
}

CardHeader.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

CardHeader.defaultProps = {
  className: ''
};

export function CardBody({ children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

CardBody.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

CardBody.defaultProps = {
  className: ''
};

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`p-6 border-t border-background-input bg-background-dark/30 ${className}`}>
      {children}
    </div>
  );
}

CardFooter.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

CardFooter.defaultProps = {
  className: ''
};

export default Card;
