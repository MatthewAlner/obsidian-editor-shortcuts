import CodeMirror from 'codemirror';
import type { Editor } from 'codemirror';
import {
  withMultipleSelections,
  getLineStartPos,
  getLineEndPos,
  getSelectionBoundaries,
  getLeadingWhitespace,
  wordRangeAtPos,
  findPosOfNextCharacter,
} from '../utils';
import { DIRECTION } from '../constants';

// fixes jsdom type error - https://github.com/jsdom/jsdom/issues/3002#issuecomment-655748833
document.createRange = () => {
  const range = new Range();

  range.getBoundingClientRect = jest.fn();

  range.getClientRects = jest.fn(() => ({
    item: () => null,
    length: 0,
  }));

  return range;
};

describe('Code Editor Shortcuts: utils', () => {
  let editor: Editor;
  const originalDoc = 'lorem ipsum';

  beforeAll(() => {
    editor = CodeMirror(document.body);
  });

  beforeEach(() => {
    editor.setValue(originalDoc);
    editor.setCursor({ line: 0, ch: 0 });
  });

  describe('withMultipleSelections', () => {
    const emptySelection = {
      anchor: { line: 0, ch: 0 },
      head: { line: 0, ch: 0 },
    };
    const firstWordSelection = {
      anchor: { line: 0, ch: 2 },
      head: { line: 0, ch: 2 },
    };
    const secondWordSelection = {
      anchor: { line: 0, ch: 8 },
      head: { line: 0, ch: 11 },
    };
    let mockCallback: jest.Mock;

    beforeEach(() => {
      // expect error to be thrown due to cm object not existing in the test editor
      jest.spyOn(console, 'error').mockImplementation(() => jest.fn());

      editor.setSelections([firstWordSelection, secondWordSelection]);
      mockCallback = jest.fn().mockReturnValue(emptySelection);
    });

    it('should execute callback for each editor selection', () => {
      withMultipleSelections(editor as any, mockCallback);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should forward any arguments to the callback', () => {
      withMultipleSelections(editor as any, mockCallback, {
        args: 'foobar',
      });
      expect(mockCallback).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'foobar',
      );
    });

    it('should post-process new selections if customSelectionHandler is provided', () => {
      const customSelectionHandler = jest.fn().mockReturnValue([
        {
          anchor: { line: 0, ch: 3 },
          head: { line: 0, ch: 7 },
        },
      ]);
      withMultipleSelections(editor as any, mockCallback, {
        customSelectionHandler,
      });
      expect(customSelectionHandler).toHaveBeenCalledWith([emptySelection]);
      expect(editor.listSelections()).toEqual([
        {
          anchor: expect.objectContaining({ line: 0, ch: 3 }),
          head: expect.objectContaining({ line: 0, ch: 7 }),
        },
      ]);
    });

    it('should filter out subsequent selections on the same line if repeatSameLineActions is false', () => {
      withMultipleSelections(editor as any, mockCallback, {
        repeatSameLineActions: false,
      });
      expect(mockCallback).toHaveBeenCalledWith(
        expect.anything(),
        firstWordSelection,
        undefined,
      );
      expect(mockCallback).not.toHaveBeenCalledWith(
        expect.anything(),
        secondWordSelection,
        undefined,
      );
    });
  });

  describe('getLineStartPos', () => {
    it('should get line start position', () => {
      const pos = getLineStartPos(0);
      expect(pos).toEqual({ line: 0, ch: 0 });
    });
  });

  describe('getLineEndPos', () => {
    it('should get line end position', () => {
      const pos = getLineEndPos(0, editor as any);
      expect(pos).toEqual({ line: 0, ch: 11 });
    });
  });

  describe('getSelectionBoundaries', () => {
    it('should get selection boundaries', () => {
      const anchor = { line: 0, ch: 5 };
      const head = { line: 0, ch: 6 };
      const pos = getSelectionBoundaries({ anchor, head });
      expect(pos).toEqual({ from: anchor, to: head });
    });

    it('should swap selection boundaries if user selects upwards', () => {
      const anchor = { line: 1, ch: 5 };
      const head = { line: 0, ch: 6 };
      const pos = getSelectionBoundaries({ anchor, head });
      expect(pos).toEqual({ from: head, to: anchor });
    });

    it('should swap selection boundaries if user selects backwards on the same line', () => {
      const anchor = { line: 0, ch: 8 };
      const head = { line: 0, ch: 4 };
      const pos = getSelectionBoundaries({ anchor, head });
      expect(pos).toEqual({ from: head, to: anchor });
    });
  });

  describe('getLeadingWhitespace', () => {
    it('should get leading whitespace', () => {
      const whitespace = getLeadingWhitespace('  hello');
      expect(whitespace.length).toEqual(2);
    });
  });

  describe('wordRangeAtPos', () => {
    it('should get boundaries of word at given position', () => {
      const range = wordRangeAtPos({ line: 0, ch: 8 }, editor.getLine(0));
      expect(range).toEqual({
        anchor: {
          line: 0,
          ch: 6,
        },
        head: {
          line: 0,
          ch: 11,
        },
      });
    });
  });

  describe('findPosOfNextCharacter', () => {
    it('should search forwards', () => {
      const pos = findPosOfNextCharacter({
        editor: editor as any,
        startPos: { line: 0, ch: 5 },
        checkCharacter: (char: string) => /s/.test(char),
        searchDirection: DIRECTION.FORWARD,
      });
      expect(pos).toEqual({
        match: 's',
        pos: {
          line: 0,
          ch: 8,
        },
      });
    });

    it('should search backwards', () => {
      const pos = findPosOfNextCharacter({
        editor: editor as any,
        startPos: { line: 0, ch: 5 },
        checkCharacter: (char: string) => /r/.test(char),
        searchDirection: DIRECTION.BACKWARD,
      });
      expect(pos).toEqual({
        match: 'r',
        pos: {
          line: 0,
          ch: 3,
        },
      });
    });

    it('should return null if no matches', () => {
      const pos = findPosOfNextCharacter({
        editor: editor as any,
        startPos: { line: 0, ch: 0 },
        checkCharacter: (char: string) => /x/.test(char),
        searchDirection: DIRECTION.FORWARD,
      });
      expect(pos).toBeNull();
    });
  });
});
