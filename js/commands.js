function help(){
  window.terminal.echo(['available commands:',
            '\twhen',
            '\twhere',
            '\twho',
            '\tdeadline',
            '\ttopics',
            '\tsubmit',
            '\tchallenge',
            '\tgpgkey',
            ].join('\n')
  );
}

function when(){
  window.terminal.echo("conf will be held from the 19th to the 21st of Sept 2014")
}

function where(){
  window.terminal.echo("undisclosed");
}

function who(){
  window.terminal.echo("a bunch of crazy bastards");
}

function deadline(){
  window.terminal.echo("cfp's deadline is set to the 1st of Sept")
}

function topics(){
  window.terminal.echo(['topics include:',
            '- h/p/v/c/e ...',
            '- satellites, antennas and radioactive crap',
            '- cryptocurrencies',
            '- human powered vehicles',
            '- knitting',
            '- lating dancing',
            '- celebrity\'s private life (ie britney spears)',
            '- radare',
            '- cats',
            '- cyborgs',
            '- 8===========D',
            '- ...',
    ].join('\n')
  );
}

function submit(){
  window.terminal.echo('submit your proposal to [[u;blue;]lacon2k14.org@lists.48bits.com]');

}
 
function radare(){
  window.terminal.error('segmentation fault')

}

function alice(args){
  var c = '';
  if (args.length == 1) c = args[0];
  var ret = ccall('mmain',
        'number',
        ['string'],
        [c]);
  if (ret == 1){
    window.terminal.echo('\nnow, go ahead and submit your solution to [[u;blue;]lacon2k14.org@lists.48bits.com] to get your reward!\n');
  }
}

function gpgkey(args){
  window.terminal.echo('gpg --keyserver pgp.mit.edu --recv-key 0xAD03E595\n');
}

var Module = {
  print:(function(text){
    window.terminal.echo(text);
  })
};
