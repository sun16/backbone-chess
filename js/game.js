var Square = Backbone.Model.extend({
  defaults: {
    pos: "",
    piece:"",
    selected: false,
  },
  getPieceClass: function() {
    var p = this.get('piece');
    if( p ) {
      return 'piece-' + p.type + p.color;
    }
    return "";
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
      pos: this.model.get('pos'),
      cid: this.model.cid
    });
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
      //build board
      var letters = "abcdefgh".split('');
      for( var i = 8; i > 0; i-- ) {
        for(k in letters ) {
          var ch = letters[k];
          var pos = ch + i;
          var piece = chess.get(pos);
          var sq = {
            pos: pos
          }
          if( piece != null ) {
            sq['piece'] = piece;
          }
          this.add(sq);
        } //for k in letters
      } //for i in 8..1

      this.bind('change:selected', this.selectHandler)
    }, //initialize
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
  className: 'span10',
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
  updateHistory: function() {
    var history = chess.pgn();
    history = $.trim(history.split(/(\d\.) /).join("\n").replace(/\.\n/g,'. ')).split("\n").join("<br />")
    $(this.el).find('#history .content').html(history);
  },
  render: function() {
    var that = this;
    var $t = $(this.el);
    $t.empty(); //clear out this element
    _.each(this.squareViews, function(v){
      v.render();
      $t.append(v.el);
    });
    $t.append('<div id="history" class="span4"><h3>History</h3><div class="content"></div></div>')
    this.updateHistory();
    var $squares = $t.find('.sq');
    $squares
      .draggable({
        revert: true,
        containment:'parent',
        revertDuration:0,
        zIndex: 99,
        start: function(event, ui) {
          console.log('dragstart');
          var $square = $(ui.helper);
          var square = that.collection.getByCid($square.data('cid'));
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
            from: $from.data('pos'),
            to: $to.data('pos')
          };
          var to_model = that.collection.getByCid($to.data('cid'))
          var from_model = that.collection.getByCid($from.data('cid'))
          console.log('attempting move', move);
          var success = chess.move(move);
          if( success != null ) {
            console.log(chess.ascii());
            var to_model = that.collection.getByCid($to.data('cid'))
            var from_model = that.collection.getByCid($from.data('cid'))
            to_model.set({piece: from_model.get('piece')});
            from_model.set({piece: null, selected: false});
            that.updateHistory();
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

boardView.make();
$('.content').append(boardView.el);
$(boardView.el).wrap('<div class="row" />');
boardView.render();
