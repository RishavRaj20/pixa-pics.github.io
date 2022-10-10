import * as React from "react";

function SvgBq(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width={600}
      height={400}
      {...props}
    >
      <path fill="#fff" d="M0 0h600v400H0z" />
      <path d="M600 400H0L600 0z" fill="#012a87" />
      <path d="M0 0v166.667L250 0z" fill="#f9d90f" />
      <circle
        cx={165}
        cy={173}
        r={80}
        fill="none"
        stroke="#000"
        strokeWidth={11}
      />
      <g id="BQ_svg__b">
        <path d="M165 69.834l15 25.981h-30z" fill="#000" id="BQ_svg__a" />
        <use xlinkHref="#BQ_svg__a" transform="rotate(180 165 173)" />
      </g>
      <use xlinkHref="#BQ_svg__b" transform="rotate(90 165 173)" />
      <path d="M165 122l44.167 76.5h-88.334z" fill="#dc171d" id="BQ_svg__c" />
      <use xlinkHref="#BQ_svg__c" transform="rotate(60 165 173)" />
    </svg>
  );
}

export default SvgBq;