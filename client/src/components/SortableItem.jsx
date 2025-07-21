import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Wraps a child element to make it draggable and sortable using dnd-kit.
 *
 * @param {string | number} id - Unique identifier for this sortable item.
 * @param {React.ReactNode} children - The content to be rendered inside this sortable item.
 */
function SortableItem({ id, children }) {
  // Hook from dnd-kit to make this element sortable
  const {
    attributes,    // Props for accessibility and drag handle
    listeners,     // Event listeners for drag interactions
    setNodeRef,    // Ref callback to bind DOM node
    transform,     // CSS transform styles for dragging
    transition,    // CSS transition for smooth animations
  } = useSortable({ id });

  // Compose style for transform and cursor
  const style = {
    transform: CSS.Transform.toString(transform), // converts transform object to CSS string
    transition,
    cursor: "grab", // indicates draggable item
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export default SortableItem;
