import * as React from 'react';
import {useReducer, useEffect, useRef, useCallback, useMemo, useLayoutEffect} from 'react';

import styled from 'styled-components';

const scan = (arr, init, fn) => {
    let acc = init;

    const result = arr.map((e) => {
        const pre = acc;
        acc = fn(acc, e)
        return pre;
    })

    result.push(acc)

    return result;
}

const Overflowable = styled.div`
    overflow: scroll;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overscroll-behavior: contain;
`

const Cell = ({x, y, children}) => {
    return <div style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        background: '#fff',
        zIndex:10,
        border: '1px solid gray',

    }}>{children}</div>;
}

const Row = ({y, children}) => {
    return <div style={{
        position: 'absolute',
        top: `${y}px`,
    }}>{children}</div>;
}

const Box = ({x,y,width,height,children=null}) => {
    return <div style={{
        position: 'absolute',
        left:`${x}px`,
        top:`${y}px`,
        width:`${width}px`,
        height:`${height}px`,
        background: 'purple',
        overflow: 'hidden',
    }}>
        {children}
    </div>
}

const Spacer = ({width, height, children = null}) => {
    return <div style={{
        width: width + 'px',
        height: height + 'px',
        minHeight: '100%',
        minWidth: '100%',
    }}>{children}</div>;
}

const Scroller = ({scrollTop, scrollLeft, children, onResize, onScroll}) => {
    const ref = useRef();
    useEffect(() => {
        const handler = () => {
            const el : HTMLElement = ref.current;
            if(el) {
                onResize(el.clientWidth, el.clientHeight);
            }
        }

        window.addEventListener('resize', handler)

        handler()

        return () => {
            window.removeEventListener('resize', handler)

        }
    }, [ref, onResize])

    const scrollHandler = useCallback((evt) => {
        const el : HTMLElement = ref.current;
        if(el) {
            onScroll(el.scrollLeft, el.scrollTop);
        }
    }, [onScroll])

    useLayoutEffect(() => {
        const el : HTMLElement = ref.current;
        if(el) {
            el.scrollLeft = scrollLeft;
        }
    }, [ref, scrollLeft])

    useLayoutEffect(() => {
        const el : HTMLElement = ref.current;
        if(el) {
            el.scrollTop = scrollTop;
        }
    }, [ref, scrollTop])

    return <Overflowable onScroll={scrollHandler} ref={ref}>{children}</Overflowable>;
}

const tableReducer = (state, action) => {
    switch (action.type) {
        case 'resize': {
            return {
                ...state,
                viewport: {
                    width: action.width,
                    height: action.height,
                }
            }
        }
        case 'init': {
            return {
                ...state,
                layout: {
                    defaultWidth: 100,
                    defaultHeight: 100,
                    width: Array.from(Array(action.columns)).map((_,c) => null),
                    height: Array.from(Array(action.rows)).map((_,c) => null),
                    heightKnown: Array.from(Array(action.columns)).map((_,c) => false),
                    widthKnown: Array.from(Array(action.rows)).map((_,c) => false),
                },
                data: Array.from(Array(action.rows)).map((_,r) =>
                    Array.from(Array(action.columns)).map((_,c) => `${r},${c}`)
                )
            }
        }
        case 'scroll':
            return {
                ...state,
                scrollOffset: {
                    x: action.x,
                    y: action.y,
                },
            };
        case 'scrollToBottom':
            return {
                ...state,
                scrollOffset: {
                    ...state.scrollOffset,
                    y: state.layout.height.reduce((acc, h) => acc + (h||state.layout.defaultHeight), 0) - state.viewport.height,
                },
            };
        case 'setWidth':
        case 'setHeight':
        case 'addRow':
        case 'addColumn':
        case 'removeRow':
        case 'removeColumn':
            return state;
    }

    return state;
}

const Table = () => {
    const [state, dispatch] = useReducer(tableReducer, {
        viewport: {
            width: 0,
            height: 0,
        },
        scrollOffset: {
            x: 0,
            y: 0,
        },
        layout: {
            defaultWidth: 30,
            defaultHeight: 30,
            width: [],
            height: [],
            heightKnown: [],
            widthKnown: [],
        },
        data: [
        ]
    })

    const onResize = useCallback((width, height) => {
        dispatch({
            type: 'resize',
            width,
            height,
        })
    }, [dispatch]);

    useEffect(() => {
        dispatch({type: 'init', rows: 100, columns: 30})
    }, [])

    const onScroll = useCallback((x, y) => {
        dispatch({
            type: 'scroll',
            x,
            y,
        })
    }, [dispatch]);

    useEffect(() => {
        dispatch({type: 'init', rows: 5000, columns: 100})
    }, [])

    const integratedY = useMemo(() => scan(state.layout.height, 0, (acc, h) => acc + (h||state.layout.defaultHeight)), [state.layout.width])
    const integratedX = useMemo(() => scan(state.layout.width, 0, (acc, w) => acc + (w||state.layout.defaultWidth)), [state.layout.height])

    const totalWidth = (integratedX[integratedX.length - 1]) || 0
    const totalHeight = (integratedY[integratedY.length - 1]) || 0

    const offsetXMin = state.scrollOffset.x
    const offsetXMax = state.scrollOffset.x + state.viewport.width
    const offsetYMin = state.scrollOffset.y
    const offsetYMax = state.scrollOffset.y + state.viewport.height

    let firstRow = integratedY.findIndex((h) => h > offsetYMin)
    let lastRow = integratedY.findIndex((h) => h > offsetYMax)
    let firstColumn = integratedX.findIndex((w) => w > offsetXMin)
    let lastColumn = integratedX.findIndex((w) => w > offsetXMax)


    if(firstRow < 0) {
        firstRow = 0;
    }
    if(firstColumn < 0) {
        firstColumn = 0;
    }
    if(lastRow < 0) {
        lastRow = integratedY.length - 1;
    }
    if(lastColumn < 0) {
        lastColumn = integratedX.length - 1;
    }

    if(firstRow > 0) {
        firstRow--;
    }

    if(firstColumn > 0) {
        firstColumn--;
    }

    const rows = Array.from(Array(lastRow - firstRow)).map((_,r) =>
        <React.Fragment key={r}>
            {
                Array.from(Array(lastColumn - firstColumn)).map((_,c) =>
                    <Cell x={integratedX[firstColumn + c]} y={integratedY[firstRow + r]} key={c}>{state.data[firstRow+r][firstColumn+c]}</Cell>
                )
            }
        </React.Fragment>
    )

    const scrollToBottom = useCallback(() => {
        dispatch({type: 'scrollToBottom'})
    }, [dispatch])

    return <Scroller scrollTop={state.scrollOffset.y} scrollLeft={state.scrollOffset.x} onResize={onResize} onScroll={onScroll}>
        <div style={{
            position: 'absolute',
            left: `${state.scrollOffset.x}px`,
            top: `${state.scrollOffset.y}px`,
            background: '#000',
            color: '#fff',
            opacity: 0.5,
            zIndex: 30,
        }} onClick={scrollToBottom}>
            {state.viewport.width},{state.viewport.height}<br/>
            {totalWidth},{totalHeight}
        </div>
        <Spacer width={totalWidth} height={totalHeight} />
        {/*<Box
            x={state.scrollOffset.x}
            y={state.scrollOffset.y}
            width={state.viewport.width}
            height={state.viewport.height}>
        </Box>*/}
        {rows}
    </Scroller>;
}

export default Table
