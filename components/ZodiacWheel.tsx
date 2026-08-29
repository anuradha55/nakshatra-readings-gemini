export default function ZodiacWheel() {
  return (
    <div className="wheel-wrap">
      <svg className="wheel" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <circle cx="200" cy="200" r="186" fill="none" stroke="#CDA463" strokeOpacity=".5" />
        <circle cx="200" cy="200" r="150" fill="none" stroke="#CDA463" strokeOpacity=".35" />
        <circle cx="200" cy="200" r="112" fill="none" stroke="#C98BA0" strokeOpacity=".4" />
        <g stroke="#CDA463" strokeOpacity=".3">
          <line x1="200" y1="14" x2="200" y2="386" />
          <line x1="14" y1="200" x2="386" y2="200" />
          <line x1="59" y1="59" x2="341" y2="341" />
          <line x1="341" y1="59" x2="59" y2="341" />
        </g>
        <g fontFamily="Fraunces, serif" fontSize="20" fill="#E7D3A6" textAnchor="middle">
          <text x="200" y="34">♈</text><text x="292" y="58">♉</text><text x="358" y="128">♊</text>
          <text x="382" y="206">♋</text><text x="358" y="284">♌</text><text x="292" y="352">♍</text>
          <text x="200" y="380">♎</text><text x="108" y="352">♏</text><text x="42" y="284">♐</text>
          <text x="18" y="206">♑</text><text x="42" y="128">♒</text><text x="108" y="58">♓</text>
        </g>
        <circle cx="200" cy="200" r="3" fill="#E7D3A6" />
      </svg>
    </div>
  );
}