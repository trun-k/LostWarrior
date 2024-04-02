/*

Game states:

Init
  |
Preload
  |
Create
  |
Update/Render(Gameloop) => Update <-> Render (at 60 fps)
  |
Shutdown

*/


// Initialize game state

PlayState = {};

PlayState.init = function(){
    this.keys = this.game.input.keyboard.addKeys({left: Phaser.KeyCode.LEFT, right: Phaser.KeyCode.RIGHT, up: Phaser.KeyCode.UP}); // adding key controls
    this.game.renderer.renderSession.roundPixels = true;    // adding pixelated movement instead of smooth one
    this.keys.up.onDown.add(function(){
        let didJump = this.hero.jump();
        if(didJump){
            this.sfx.jump.play();
        }
    },this);
    this.coinCount = 0;     // coin score
};


// Preloads

PlayState.preload = function(){
    // level
    this.game.load.json('level:1','data/level01.json');

    // images
    this.game.load.image('background', 'images/background.png');
    this.game.load.image('ground', 'images/ground.png');
    this.game.load.image('grass:8x1', 'images/grass_8x1.png');
    this.game.load.image('grass:6x1', 'images/grass_6x1.png');
    this.game.load.image('grass:4x1', 'images/grass_4x1.png');
    this.game.load.image('grass:2x1', 'images/grass_2x1.png');
    this.game.load.image('grass:1x1', 'images/grass_1x1.png');

    // characters
    this.game.load.image('hero', 'images/hero_stopped.png');

    // coins
    this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);

    // enemies
    this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);

    // invisible wall to prevent enemies from falling
    this.game.load.image('invisible-wall', 'images/invisible_wall.png');

    // icon
    this.game.load.image('icon:coin', 'images/coin_icon.png');
    this.game.load.image('font:numbers', 'images/numbers.png');

    // audio
    this.game.load.audio('sfx:jump', 'audio/jump.wav');
    this.game.load.audio('sfx:coin', 'audio/coin.wav');
    this.game.load.audio('sfx:stomp', 'audio/stomp.wav');
};


// Creating elements of game loop

PlayState.create = function(){
    this.game.add.image(0, 0, 'background');
    this._loadLevel(this.game.cache.getJSON('level:1'));
    this.sfx = {
        jump: this.game.add.audio('sfx:jump'),
        coin: this.game.add.audio('sfx:coin'),
        stomp: this.game.add.audio('sfx:stomp')
    };
    this._spawnIcons();
};


PlayState._loadLevel = function(data){
    // group together platforms
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false;

    // spawn platforms
    data.platforms.forEach(this._spawnPlatform, this);

    // spawn chracters
    this._spawnCharacters({hero: data.hero, spiders: data.spiders});

    // spawm objects
    data.coins.forEach(this._spawnCoin, this);

    // set gravity
    const GRAVITY = 1200;
    this.game.physics.arcade.gravity.y = GRAVITY;
};


// spawn platforms
PlayState._spawnPlatform = function(platform){
    let sprite = this.platforms.create(platform.x, platform.y, platform.image);
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};


// walls to help enemies not fall off the platform
PlayState._spawnEnemyWall = function(x, y, side){
    let sprite = this.enemyWalls.create(x,y,'invisible-wall');
    // anchor and y-displacement
    sprite.anchor.set(side==='left'?1:0, 1);

    this.game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
};


// spawn characters
PlayState._spawnCharacters = function(data){
    // spawn hero
    this.hero = new Hero(this.game, data.hero.x, data.hero.y);
    this.game.add.existing(this.hero);

    // spawn enemies
    data.spiders.forEach(function(spider){
        let sprite = new Spider(this.game, spider.x, spider.y);
        this.spiders.add(sprite);
    }, this);
};


// spawn objects
PlayState._spawnCoin = function(coin){
    let sprite = this.coins.create(coin.x, coin.y, 'coin');
    sprite.anchor.set(0.5, 0.5);
    sprite.animations.add('rotate', [0,1,2,1], 6, true);
    sprite.animations.play('rotate');
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
}


// spawn icons for score, lives etc
PlayState._spawnIcons = function(){
    // score numbers
    const NUMBERS_STR = '0123456789X ';
    this.coinFont = this.game.add.retroFont('font:numbers', 20, 26, NUMBERS_STR, 6);

    // score graphic
    let coinIcon = this.game.make.image(0, 0, 'icon:coin');
    let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width, coinIcon.height / 2, this.coinFont);
    coinScoreImg.anchor.set(0, 0.5);
    
    this.hud = this.game.add.group();
    this.hud.add(coinIcon);
    this.hud.add(coinScoreImg);
    this.hud.position.set(10, 10);
};


// Hero object details 
function Hero(game, x, y){
    // call Phaser.Sprite constructor
    Phaser.Sprite.call(this, game, x, y, 'hero');
    this.anchor.set(0.5, 0.5);
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
}

// inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.move = function(direction){
    const SPEED = 200;
    this.body.velocity.x = direction * SPEED;
};
Hero.prototype.jump = function(){
    const JUMP_SPEED = 600;
    let canJump = this.body.touching.down;
    if(canJump){
        this.body.velocity.y = -JUMP_SPEED;
    }
    return canJump;
};
Hero.prototype.bounce = function(){
    const BOUNCE_SPEED = 200;
    this.body.velocity.y = -BOUNCE_SPEED;
};



// Spider object details
function Spider(game, x, y){
    // call Phaser.Sprite constructor
    Phaser.Sprite.call(this, game, x, y, 'spider');
    this.anchor.set(0.5);   // anchor

    // animation
    this.animations.add('crawl', [0, 1, 2], 8, true);   // 8 frames per second loop
    this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
    this.animations.play('crawl');
    this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);

    // physics
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
    this.body.velocity.x = Spider.SPEED;
}

Spider.SPEED = 100;

// inherit from Phaser.Sprite
Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;
Spider.prototype.update = function(){
    // check against walls and reverse direction if necessary
    if (this.body.touching.right || this.body.blocked.right) {
        this.body.velocity.x = -Spider.SPEED; // turn left
    }
    else if (this.body.touching.left || this.body.blocked.left) {
        this.body.velocity.x = Spider.SPEED; // turn right
    }
};
Spider.prototype.die = function(){
    this.body.enable = false;
    this.animations.play('die').onComplete.addOnce(function(){
        this.kill();
    }, this);
};


// The game loop

// key controls
PlayState._handleInput = function(){
    if(this.keys.left.isDown){
        this.hero.move(-1);
    }else if(this.keys.right.isDown){
        this.hero.move(1);
    }else{
        this.hero.move(0);
    }
};

// check for collisions for hero and objects
PlayState._handleCollisions = function(){
    this.game.physics.arcade.collide(this.hero, this.platforms);    // collision of hero with platform and walls
    this.game.physics.arcade.collide(this.spiders, this.platforms); // collision of platform and enemies
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);    // collision with invisible walls to prevent spiders from falling off
    this.game.physics.arcade.overlap(this.hero, this.coins, this._hitCoin, null, this);   // collision with coin
    this.game.physics.arcade.overlap(this.hero, this.spiders, this._hitEnemy, null, this);  // collision of hero and enemy
};

// upon colliding with enemy
PlayState._hitEnemy = function(hero, enemy){
    this.sfx.stomp.play();
    if(hero.body.velocity.y > 0){     // kill enemies
        hero.bounce();
        enemy.die();
    }else{
        this.game.state.restart();
    }
};

// upon collision with coin
PlayState._hitCoin = function(hero, coin){
    coin.kill();
    this.sfx.coin.play();
    this.coinCount++;
};


PlayState.update = function(){
    this._handleCollisions();
    this._handleInput();
    this.coinFont.text = `x${this.coinCount}`;
};


window.onload = function(){
    let game = new Phaser.Game(960, 600, Phaser.Auto, 'game');
    game.state.add('play', PlayState);
    game.state.start('play');
};