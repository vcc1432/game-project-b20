import { 
  JsonController, Authorized, CurrentUser, Post, Param, BadRequestError, HttpCode, NotFoundError, ForbiddenError, Get, 
  Body, Patch 
} from 'routing-controllers'
import User from '../users/entity'
import { Game, Player, Board } from './entities'
import {IsBoard, finished,calculateWinner} from './logic'
import { Validate } from 'class-validator'
import {io} from '../index'
const sleep = require('sleep-promise')
// isValidTransition


class GameUpdate {

  @Validate(IsBoard, {
    message: 'Not a valid board'
  })
  board: Board
}

@JsonController()
export default class GameController {

  @Authorized()
  @Post('/games')
  @HttpCode(201)
  async createGame(
    @CurrentUser() user: User
  ) {
    const entity = await Game.create().save()

    await Player.create({
      game: entity, 
      user,
      symbol: 'x'
    }).save()

    const game = await Game.findOneById(entity.id)

    io.emit('action', {
      type: 'ADD_GAME',
      payload: game
    })

    return game
  }

  @Authorized()
  @Post('/games/:id([0-9]+)/players')
  @HttpCode(201)
  async joinGame(
    @CurrentUser() user: User,
    @Param('id') gameId: number
  ) {
    const game = await Game.findOneById(gameId)
    if (!game) throw new BadRequestError(`Game does not exist`)
    if (game.status !== 'pending') throw new BadRequestError(`Game is already started`)

    game.status = 'started'
    await game.save()

    const player = await Player.create({
      game, 
      user,
      symbol: 'o'
    }).save()

    io.emit('action', {
      type: 'UPDATE_GAME',
      payload: await Game.findOneById(game.id)
    })

    return player
  }

  @Authorized()
  // the reason that we're using patch here is because this request is not idempotent
  // http://restcookbook.com/HTTP%20Methods/idempotency/
  // try to fire the same requests twice, see what happens
  @Patch('/games/:id([0-9]+)')
  async updateGame(
    @CurrentUser() user: User,
    @Param('id') gameId: number,
    @Body() update: GameUpdate
  ) {
    const game = await Game.findOneById(gameId)
    if (!game) throw new NotFoundError(`Game does not exist`)

    const player = await Player.findOne({ user, game })

    if (!player) throw new ForbiddenError(`You are not part of this game`)
    if (game.status !== 'started') throw new BadRequestError(`The game is not started yet`)
    if (player.symbol !== game.turn) throw new BadRequestError(`It's not your turn`)
    // if (!isValidTransition(player.symbol, game.board, update.board)) {
    //   throw new BadRequestError(`Invalid move`)
    // }    

    // const result = finished(update.board)
    // console.log(result)
    // console.log(update.board)

    // const winner = calculateWinner(result, game.scoreX, game.scoreO)
      
    // if (winner) {
    //   game.winner = winner
    //   game.status = 'finished'
    // }
    // else if (finished(update.board)) {
    //   game.status = 'finished'
    // }
    
    else {
      const selectedImages = await update.board.map(row => row.filter(cell => cell !== null && cell!==""))
    
      let imagesArray = [].concat.apply([], selectedImages)

      if(imagesArray.length ===2 && imagesArray[0] === imagesArray[1]){
        //Make updated board cell be equal to "" - makes the div to be hidden     
  
        const correctMove = update.board.map(row => row.map(cell =>{
          if(cell === imagesArray[0]){
            return ""
          }
          else {
            return cell
          }
        }))
        
        game.board = update.board
        await game.save()
    
        io.emit('action', {
          type: 'UPDATE_GAME',
          payload: game
        })

        await sleep(1000);
        update.board = correctMove; 

        player.symbol === 'x' ? game.scoreX += 10 : game.scoreO +=10

        const result = finished(update.board)

        const winner = calculateWinner(result, game.scoreX, game.scoreO)
        
          if (winner) {
            game.winner = winner
            game.status = 'finished'
          }
          else if (finished(update.board)) {
            game.status = 'finished'
          }
      }
      else if(imagesArray.length===2 && imagesArray[0] !== imagesArray[1]){
        const wrongMove = update.board.map(row => row.map(cell => {
          if(cell === imagesArray[0] || cell===imagesArray[1]){
            return null
          }
          else {
            return cell
          }
        }))

        game.board = update.board
        await game.save()
        
        io.emit('action', {
          type: 'UPDATE_GAME',
          payload: game
        })  

        await sleep(1000);
        update.board = wrongMove

        game.turn = (player.symbol === 'x' && imagesArray.length ===2) ? 'o' : 'x'
      }
    }
    

    game.board = update.board
  
    await game.save()
    
    io.emit('action', {
      type: 'UPDATE_GAME',
      payload: game
    })
    
    return game
  }

  @Authorized()
  @Get('/games/:id([0-9]+)')
  getGame(
    @Param('id') id: number
  ) {
    return Game.findOneById(id)
  }

  @Authorized()
  @Get('/games')
  getGames() {
    return Game.find()
  }
}

