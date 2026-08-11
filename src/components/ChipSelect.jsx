// Multi-select via chips. `value` is an array, `onChange` returns the new array.
export default function ChipSelect({ options, value, onChange }) {
  function toggle(opt) {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  }
  return (
    <div className="chips">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={"chip" + (value.includes(opt) ? " on" : "")}
          onClick={() => toggle(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
