import React from 'react';
import uuidv1 from 'uuid/v1';
import { arrayMove, SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import './App.css';

export default class App extends React.Component {
  constructor(props) {
    super(props);

    const existingValues = props.extension.field.getValue();

    this.state = {
      values: existingValues ? existingValues.map((value) => ({ id: uuidv1(), value })) : [],
      focus: false,
      dragging: false,
    };

    this.blockExternalChanges = false;
    this.timeoutHandler = null;
  }

  componentDidMount() {
    const { extension } = this.props;

    extension.window.startAutoResizer();

    this.detachValueChangeHandler = extension.field.onValueChanged((newValues) => {
      this.updateState('external', { values: newValues ? newValues.map((value) => ({ id: uuidv1(), value })) : [] });
    });
  }

  componentWillUnmount() {
    this.props.extension.window.stopAutoResizer();
    this.detachValueChangeHandler();
  }

  render() {
    const { values, focus, dragging } = this.state;

    return (
      <>
        <SortableList
          items={values}
          onChange={this.handleChange}
          onDelete={this.handleDeleteItemClick}
          focus={focus}
          onSortStart={this.handleSortStart}
          onSortEnd={this.handleSortEnd}
          lockAxis="y"
          useDragHandle={true}
          helperClass="helper"
          dragging={dragging}
        />
        <button
          type="button"
          className="cf-btn-secondary"
          onClick={this.handleAddItemClick}
          children="Eintrag hinzufügen"
        />
      </>
    );
  }

  updateState = (source, newState) => {
    if (source === 'external' && this.blockExternalChanges) return;

    if (source === 'internal') {
      this.blockExternalChanges = true;
      clearTimeout(this.timeoutHandler);
      this.timeoutHandler = setTimeout(() => {
        this.blockExternalChanges = false;
      }, 1000);
    }

    this.setState(newState, source === 'internal' ? this.reportValues : undefined);
  };

  handleAddItemClick = () => {
    const prevValues = this.state.values;

    this.updateState('internal', {
      values: [...prevValues, { id: uuidv1(), value: '' }],
      focus: true,
    });
  };

  handleDeleteItemClick = (event) => {
    const li = event.currentTarget.closest('li');
    const prevValues = this.state.values;

    const index = prevValues.findIndex(({ id }) => id === li.dataset.id);
    if (index === -1) {
      console.error("Didn't find value in state", event, prevValues);
      return;
    }

    this.updateState('internal', {
      values: [
        ...prevValues.slice(0, index),
        ...prevValues.slice(index + 1),
      ],
      focus: false,
    });
  };

  handleChange = (event) => {
    const input = event.currentTarget;
    const prevValues = this.state.values;

    const index = prevValues.findIndex(({ id }) => id === input.closest('li').dataset.id);
    if (index === -1) {
      console.error("Didn't find value in state", event, prevValues);
      return;
    }
    const id = prevValues[index].id;

    this.updateState('internal', {
      values: [
        ...prevValues.slice(0, index),
        { id: id, value: input.value },
        ...prevValues.slice(index + 1),
      ],
      focus: false,
    });
  };

  handleSortStart = () => {
    this.updateState('internal', {
      dragging: true,
      focus: false,
    });
  };

  handleSortEnd = ({ oldIndex, newIndex }) => {
    const prevValues = this.state.values;

    this.updateState('internal', {
      values: arrayMove(prevValues, oldIndex, newIndex),
      dragging: false,
      focus: false,
    });
  };

  reportValues() {
    const { extension } = this.props;
    const { values } = this.state;

    extension.field.setValue(values.map(({ value }) => value));
  }
}

const Handle = SortableHandle(() => (
  <div className="drag-handle"/>
));

const SortableItem = SortableElement(({ id, value, onChange, onDelete, autoFocus }) => (
  <li className="item" data-id={id}>
    <Handle/>
    <input className="cf-form-input" value={value} onChange={onChange} autoFocus={autoFocus}/>
    <button type="button" className="cf-btn-secondary delete-button" title="entfernen" onClick={onDelete}>
      &times;
    </button>
  </li>
));

const SortableList = SortableContainer(({ items, onChange, onDelete, focus, dragging }) => (
  <ol className={`item-list ${dragging ? 'dragging' : ''}`}>
    {items.map(({ id, value }, index) => (
      <SortableItem
        key={id}
        id={id}
        index={index}
        value={value}
        onChange={onChange}
        onDelete={onDelete}
        autoFocus={index === items.length - 1 && focus}
      />
    ))}
  </ol>
));
