/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */
'use strict';

let React;
let ReactNoop;
let Scheduler;

describe('ReactWorkLoop', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
  });

  function createChild(name) {
    return ({children}) => {
      React.useEffect(() => {
        Scheduler.unstable_yieldValue(`${name} passive effect`);
        return () => {
          Scheduler.unstable_yieldValue(`${name} passive destroy`);
        };
      });

      React.useLayoutEffect(() => {
        Scheduler.unstable_yieldValue(`${name} layout effect`);
        return () => {
          Scheduler.unstable_yieldValue(`${name} layout destroy`);
        };
      }, []);

      Scheduler.unstable_yieldValue(`${name}`);
      return (
        <>
          <span
            ref={element => {
              Scheduler.unstable_yieldValue(
                element === null
                  ? `${name} Ref null`
                  : `${name} Ref ${element.type}`,
              );
            }}>
            {name}
          </span>
          {children}
        </>
      );
    };
  }

  it('should show subtrees/mount effects/attachRefs if shown and hide subtrees/unmount effects/detachRefs if hidden', async () => {
    const ChildOne = createChild('ChildOne');
    const ChildTwo = createChild('ChildTwo');
    const ChildThree = createChild('ChildThree');
    let _setMode;
    let _setText;
    function App() {
      const [mode, setMode] = React.useState('visible');
      const [text, setText] = React.useState('Child');
      _setMode = setMode;
      _setText = setText;
      React.useEffect(() => {
        Scheduler.unstable_yieldValue('App passive effect');
        return () => {
          Scheduler.unstable_yieldValue('App passive destroy');
        };
      });

      React.useLayoutEffect(() => {
        Scheduler.unstable_yieldValue('App layout effect');
        return () => {
          Scheduler.unstable_yieldValue('App layout destroy');
        };
      });

      Scheduler.unstable_yieldValue('App');
      console.log(mode);
      return (
        <>
          <div>Always Visible</div>
          {mode === 'visible' ? (
            <>
              <ChildOne text={text}>
                <ChildTwo text={text} />
              </ChildOne>
              <ChildThree text={text} />
            </>
          ) : null}
        </>
      );
    }

    const root = ReactNoop.createRoot();
    await ReactNoop.act(async () => {
      root.render(<App />);
    });

    expect(Scheduler).toHaveYielded([
      'App',
      'ChildOne',
      'ChildTwo',
      'ChildThree',
      'ChildOne Ref span',
      'ChildTwo Ref span',
      'ChildTwo layout effect',
      'ChildOne layout effect',
      'ChildThree Ref span',
      'ChildThree layout effect',
      'App layout effect',
      'ChildTwo passive effect',
      'ChildOne passive effect',
      'ChildThree passive effect',
      'App passive effect',
    ]);
    expect(root).toMatchRenderedOutput(
      <React.Fragment>
        <div>Always Visible</div>
        <span>ChildOne</span>
        <span>ChildTwo</span>
        <span>ChildThree</span>
      </React.Fragment>,
    );

    ReactNoop.act(() => _setMode('hidden'));
    expect(Scheduler).toHaveYielded([
      'App',
      'ChildOne layout destroy',
      'ChildOne Ref null',
      'ChildTwo layout destroy',
      'ChildTwo Ref null',
      'ChildThree layout destroy',
      'ChildThree Ref null',
      'App layout destroy',
      'App layout effect',
      'ChildOne passive destroy',
      'ChildTwo passive destroy',
      'ChildThree passive destroy',
      'App passive destroy',
      'App passive effect',
    ]);
    expect(root).toMatchRenderedOutput(<div>Always Visible</div>);

    ReactNoop.act(() => _setText('New Text'));
    expect(Scheduler).toHaveYielded([
      'App',
      'App layout destroy',
      'App layout effect',
      'App passive destroy',
      'App passive effect',
    ]);

    ReactNoop.act(() => _setMode('visible'));
    expect(Scheduler).toHaveYielded([
      'App',
      'ChildOne',
      'ChildTwo',
      'ChildThree',
      'App layout destroy',
      'ChildOne Ref span',
      'ChildTwo Ref span',
      'ChildTwo layout effect',
      'ChildOne layout effect',
      'ChildThree Ref span',
      'ChildThree layout effect',
      'App layout effect',
      'App passive destroy',
      'ChildTwo passive effect',
      'ChildOne passive effect',
      'ChildThree passive effect',
      'App passive effect',
    ]);
    expect(root).toMatchRenderedOutput(
      <React.Fragment>
        <div>Always Visible</div>
        <span>ChildOne</span>
        <span>ChildTwo</span>
        <span>ChildThree</span>
      </React.Fragment>,
    );
  });
});
