function alert( message, type) {
  type = type || 'warning';
  var $alert = $('<div style="display:none;" data-alert="alert" class="alert-message '+ type+' fade in"><a href="#" class="close">x</a><p>'+ message +'</p></div>')
  $alert.alert();
  $('#messages').append($alert);
  $alert.fadeIn('fast');
  window.setTimeout(function(){
    $alert.alert('close');
  }, 5000);
}

var Square = Backbone.Model.extend({
  defaults: {
    piece:"",
    selected: false,
  },
  getPieceClass: function() {
    var p = this.get('piece');
    if( p ) {
      return 'piece-' + p.type + p.color;
    }
    return "";
  },
  getNumberPos: function() {
    return this.get('id').match(/\d+/)[0];
  },
  getLeterPos: function() {
    return this.get('id').match(/[a-z]+/)[0];
  }
});

var SquareView = Backbone.View.extend({
  tagName: 'div',
  className: 'sq',
  template: '<span />',
  events: {
    'click': 'clickHandler'  
  },
  initialize: function( options ) {
    _.bindAll(this);
    this.model.bind('change', this.render);
  },
  render: function() {
    var $t = $(this.el);
    $t.html(_.template(this.template, this.model.attributes))
    $t.data({
      id: this.model.get('id'),
      cid: this.model.cid
    });
    $t.addClass(this.model.get('id'));
    //remove old class
    $t.attr('class', $t.attr('class').replace(/piece\-\w+/,''));
    $t.addClass(this.model.getPieceClass());
    $t.removeClass('selected')
    if( this.model.get('selected') ) {
      $t.addClass('selected');
    }
  },
  clickHandler: function() {
    this.model.set({'selected': !this.model.get('selected') });
  }
});

var Board = Backbone.Collection.extend({
    model: Square,
    initialize: function(models, options){
      this.chess = options.chess;
      this.reload();
      this.bind('change:selected', this.selectHandler)
    }, //initialize
    reload: function() {
      var letters = "abcdefgh".split('');
      for( var i = 8; i > 0; i-- ) {
        for(k in letters ) {
          var ch = letters[k];
          var id = ch + i;
          var piece = this.chess.get(id);
          var sq = {
            id: id
          }
          if( piece != null ) {
            sq['piece'] = piece;
          }
          if( !this.get(id) ) {
            this.add(sq);
          }
          else {
            var sq_model = this.get(id);
            sq_model.set({'piece': piece });
          }
        } //for k in letters
      } //for i in 8..1

    },//reloadBoard
    selectHandler: function( square ) {
      //item is being selected
      if( square.get('selected') ) {
        this.each(function(m){
          //skip the square being selected
          if( m.cid == square.cid ) {
            return;
          }
          m.set({ selected: false });  
        });
      }
    }
}); //Board Collection

var BoardView = Backbone.View.extend({
  tagName: 'div',
  id: 'board',
  className: 'board-400 span7',
  initialize: function() {
    var that = this;
    this.squareViews = [];
    this.collection.each(function(square){
      var sqView = new SquareView({
        model: square
      });
      sqView.make();
      that.squareViews.push(sqView);

    });
  },
  reload: function(){
    return this.collection.reload();
  },
  updateHistory: function() {
    var history = chess.pgn();
    history = $.trim(history.split(/(\d\.) /).join("\n").replace(/\.\n/g,'. ')).split("\n").join("<br />")
    $('#history .content').html(history);
    $('.whose-turn').text(chess.turn() == "w" ? "white's turn" : "black's turn");
  },
  render: function() {
    var that = this;
    var $t = $(this.el);
    $t.empty(); //clear out this element
    _.each(this.squareViews, function(v){
      v.render();
      $t.append(v.el);
    });
    this.updateHistory();
    var $squares = $t.find('.sq');
    $squares
      .draggable({
        distance: 10,
        revert: true,
        containment:'parent',
        revertDuration:0,
        zIndex: 99,
        start: function(event, ui) {
          console.log('dragstart');
          var $square = $(ui.helper);
          var square = that.collection.get($square.data('id'));
          square.set({
            selected: true
          });
          console.log(square);
        }
      })
      .droppable({
        accept: $squares,
        drop: function(event, ui) {
          var $from = $(ui.draggable.context);
          var $to = $(this);
          var move = {
            from: $from.data('id'),
            to: $to.data('id')
          };
          var to_model = that.collection.get($to.data('id'))
          var from_model = that.collection.get($from.data('id'))
          console.log('attempting move', move);
          var success = chess.move(move);
          if( success != null ) {
            console.log(chess.ascii());
            to_model.set({piece: from_model.get('piece')});
            from_model.set({piece: null, selected: false});
            that.updateHistory();
            //reload the board on special cases
            switch ( success.flags ) {
              case chess.FLAGS.EP_CAPTURE: // en passant
              case chess.FLAGS.PROMOTION:
              case chess.FLAGS.KSIDE_CASTLE:
              case chess.FLAGS.QSIDE_CASTLE:
                that.collection.reload();
                break;
            }
            console.log($to.position())
            $('#board').block({
              css: {
                width:'230px',
                cursor: 'normal',
                top:'375px'
              },
              centerY: false,
              message: $('#submit-move-form')
            })
          }
          else {
            alert('invalid move');
            that.render();
          }
          console.log("available moves", chess.moves());
        }
      })

  }
});

var chess = new Chess();
var board = new Board([],{
  chess:chess
});
var boardView = new BoardView({
  collection: board  
});

$(function(){
  boardView.make();
  $('#board').replaceWith(boardView.el);
  boardView.render();
  $('#board-actions button[type=reset]').click(function(){
    //$(this).parent().hide();
    $("#board").unblock();
    chess.undo();
    boardView.reload();
    boardView.updateHistory();
  });
  $('#board-actions input[type=submit]').click(function(){
    //$(this).parent().hide();
    $("#board").unblock();
  });

});

