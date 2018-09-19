import React from 'react'
import './Board.css'



const renderCel = (makeMove, rowIndex, cellIndex, cell, hasTurn, images) => {
  return (
    <div
      className="board-tile"
      disabled={hasTurn}
      onClick={() => makeMove(rowIndex, cellIndex)}
      key={`${rowIndex}-${cellIndex}`}
    >
      <img src={images.find(image => image.id===cell).url}/>
    </div>
  )
}

export default function renderBoard ({board, makeMove, images}){ 
  return (
  <div className="board-wrapper">
    {board.map((rows, rowIndex) =>
     <div key={rowIndex} className="row-wrapper">
    {rows.map((cell, cellIndex) => renderCel(makeMove, rowIndex, cellIndex, cell, false, images))}
    </div> )}
  </div>
) }
