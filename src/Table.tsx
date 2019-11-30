import * as React from 'react';
import {useReducer, useEffect, useRef, useCallback, useMemo, useLayoutEffect} from 'react';

import styled from 'styled-components';

const CellEl = styled.div`
        position: absolute;
        top: 0px;
        bottom: 0px;
        background: ${({oddRow, oddColumn}) => oddRow ? (oddColumn ? '#e0e0e0' : '#eee') : (oddColumn ? '#f0f0f0' : '#fff')};
        z-index:10;
        display: flex;
        align-items: center;
        justify-content: center;
`

const RowEl = styled.div`
    position: absolute;
`

const Menu = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    z-index: 100;
`

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

const Cell = ({row, column, x, width, children}) => {
    return <CellEl oddRow={row%2!=0} oddColumn={column%2!=0} style={{
        left: `${x}px`,
        width: `${width}px`,

    }}>{children}</CellEl>;
}

const Row = ({row, y, height, children}) => {
    return <RowEl style={{
        top: `${y}px`,
        height: `${height}px`,
    }}>{children}</RowEl>;
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

    useEffect(() => {
        const el : HTMLElement = ref.current;
        if(el) {
            el.addEventListener('scroll', scrollHandler, {
                passive: false,
                capture: true,
            });
            return () => {
                el.removeEventListener('scroll', scrollHandler, {
                    capture: true,
                });
            }
        }
    }, [scrollHandler, ref])

    return <Overflowable ref={ref}>{children}</Overflowable>;
}

const tableReducer = (state, action) => {
    switch (action.type) {
        case 'init': {
            return {
                ...state,
                layout: {
                    defaultWidth: 100,
                    defaultHeight: 100,
                    width: Array.from(Array(action.columns)).map((_,c) => null),
                    height: Array.from(Array(action.rows)).map((_,c) => null),
                    widthKnown: Array.from(Array(action.columns)).map((_,c) => false),
                    heightKnown: Array.from(Array(action.rows)).map((_,c) => false),
                },
                data: Array.from(Array(action.rows)).map((_,r) =>
                    Array.from(Array(action.columns)).map((_,c) => `${r},${c}`)
                )
            }
        }
        case 'resize': {
            return {
                ...state,
                viewport: {
                    width: action.width,
                    height: action.height,
                }
            }
        }
        case 'scroll': {
            return {
                ...state,
                scrollOffset: {
                    x: action.x,
                    y: action.y,
                },
            };
        }
        case 'scrollToBottom': {
            return {
                ...state,
                scrollOffset: {
                    ...state.scrollOffset,
                    y: state.layout.height.reduce((acc, h) => acc + (h||state.layout.defaultHeight), 0) - state.viewport.height,
                },
            };
        }
        case 'addRow': {
            const index = action.index >= 0 ? action.index :
                state.layout.height.length + action.index + 1;
            let o = state.scrollOffset.y + state.viewport.height;
            let r=0;
            for(;r<index&&o>0;r++) {
                o -= state.layout.height[r] || state.layout.defaultHeight;
            }
            const needShift = r === index && o + state.scrollOffset.y - state.viewport.height > 0;
            return {
                ...state,
                scrollOffset: {
                    ...state.scrollOffset,
                    y: needShift ?
                        state.scrollOffset.y + state.layout.defaultHeight :
                        state.scrollOffset.y,
                },
                layout: {
                    ...state.layout,
                    height: [
                        ...state.layout.height.slice(0, index),
                        null,
                        ...state.layout.height.slice(index),
                    ],
                    heightKnown: [
                        ...state.layout.heightKnown.slice(0, index),
                        false,
                        ...state.layout.heightKnown.slice(index),
                    ],
                },
                data: [
                    ...state.data.slice(0, index),
                    state.layout.width.map(() => 'new Row'),
                    ...state.data.slice(index),
                ]
            }
        }
        case 'addColumn': {
            const index = action.index >= 0 ? action.index :
                state.layout.width.length + action.index + 1;
            let o = state.scrollOffset.x + state.viewport.width;
            let c=0;
            for(;c<index&&o>0;c++) {
                o -= state.layout.width[c] || state.layout.defaultWidth;
            }
            const needShift = c === index && o + state.scrollOffset.x - state.viewport.width > 0;

            return {
                ...state,
                scrollOffset: {
                    ...state.scrollOffset,
                    x: needShift ?
                        state.scrollOffset.x + state.layout.defaultWidth :
                        state.scrollOffset.x,
                },
                layout: {
                    ...state.layout,
                    width: [
                        ...state.layout.width.slice(0, index),
                        null,
                        ...state.layout.width.slice(index),
                    ],
                    widthKnown: [
                        ...state.layout.widthKnown.slice(0, index),
                        false,
                        ...state.layout.widthKnown.slice(index),
                    ],
                },
                data: state.data.map((cells) => {
                    return [
                        ...cells.slice(0, index),
                        'new Col',
                        ...cells.slice(index),
                    ]
                })
            }
        }
        case 'setWidth': {
            // TODO: Implement
        }
        case 'setHeight': {
            // TODO: Implement
        }
        case 'removeRow': {
            // TODO: Implement
        }
        case 'removeColumn': {
            // TODO: Implement
        }
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

    const onScroll = useCallback((x, y) => {
        dispatch({
            type: 'scroll',
            x,
            y,
        })
    }, [dispatch]);

    useEffect(() => {
        dispatch({type: 'init', rows: 30, columns: 20})
    }, [])

    const integratedY = useMemo(() => scan(state.layout.height, 0, (acc, h) => acc + (h||state.layout.defaultHeight)), [state.layout.height])
    const integratedX = useMemo(() => scan(state.layout.width, 0, (acc, w) => acc + (w||state.layout.defaultWidth)), [state.layout.width])


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
        <Row row={firstRow+r} height={state.layout.height[r]||state.layout.defaultHeight} y={integratedY[firstRow + r]} key={r}>
            {
                Array.from(Array(lastColumn - firstColumn)).map((_,c) =>
                    <Cell row={firstRow+r} column={firstColumn+c} width={state.layout.width[c]||state.layout.defaultWidth} x={integratedX[firstColumn + c]} key={c}>{state.data[firstRow+r][firstColumn+c]}</Cell>
                )
            }
        </Row>
    )

    const scrollToBottom = useCallback(() => {
        dispatch({type: 'scrollToBottom'})
    }, [dispatch])

    const addColumnLeft = useCallback(() => {
        dispatch({type: 'addColumn', index: 0,})
    }, [dispatch])

    const addColumnRight = useCallback(() => {
        dispatch({type: 'addColumn', index: -1,})
    }, [dispatch])

    const addRowTop = useCallback(() => {
        dispatch({type: 'addRow', index: 0,})
    }, [dispatch])

    const addRowBottom = useCallback(() => {
        dispatch({type: 'addRow', index: -1,})
    }, [dispatch])

    return <div>
        <Menu>
            <button onClick={scrollToBottom}>Scroll to Bottom</button>
            <button onClick={addRowTop}>Add Row Top</button>
            <button onClick={addRowBottom}>Add Row Bottom</button>
            <button onClick={addColumnLeft}>Add Column Left</button>
            <button onClick={addColumnRight}>Add Column Right</button>
        </Menu>
        <Scroller scrollTop={state.scrollOffset.y} scrollLeft={state.scrollOffset.x} onResize={onResize} onScroll={onScroll}>
        <Spacer width={totalWidth} height={totalHeight} />
        {/*<Box
            x={state.scrollOffset.x}
            y={state.scrollOffset.y}
            width={state.viewport.width}
            height={state.viewport.height}>
        </Box>*/}
        {rows}
    </Scroller>
    </div>;
}

export default Table
