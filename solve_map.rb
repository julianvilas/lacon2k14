# REFUSE ANY RESPONSIBILITY OF THE DAMAGE THAT THIS CODE CAN PRODUCE TO YOUR EYES :P

class Map
	MAX_DEST = 9
	MAX_R = 13
	UP = 1
	DOWN = 2
	RIGHT = 3
	LEFT = 4

	attr_accessor :dest, :r, :plain, :int_map, :cand, :sols, :best_sol

	def initialize(dest = 3, r = 12, plain = 1)
		@dest = dest
		@r = r
		@plain = plain

		@int_map = [
			[1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 0],
			[1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
			[1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
			[1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1],
			[1, 1, 1, 2, 2, 2, 1, 5, 1, 0, 0, 1, 1, 1],
			[1, 1, 1, 0, 0, 2, 1, 1, 1, 0, 0, 1, 0, 0],
			[0, 0, 1, 0, 0, 2, 2, 2, 2, 2, 1, 1, 0, 0],
			[0, 0, 1, 1, 1, 2, 2, 1, 2, 2, 2, 0, 0, 0],
			[0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 0, 0 ,0],
			[0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0 ,0, 0]
		]

    	@sols = []
    	@best_sol = -1
  	end


	def move_up
		@dest -= 1

		if @plain == 1
			@dest -= 1
			@plain = 2
		elsif @plain == 2
			@plain = 1
		end
	end

	def move_down
		@dest += 1

		if @plain == 2
			@dest += 1
			@plain = 1
		elsif @plain == 1
			@plain = 2
		end
	end

	def move_right
		@r += 1

		if @plain == 3
			@r += 1
			@plain = 1
		elsif @plain == 1
			@plain = 3
		end
	end

	def move_left
		@r -= 1

		if @plain == 1
			@r -= 1
			@plain = 3
		elsif @plain == 3
			@plain = 1
		end
	end

	def good_position?
		return false if (@dest < 0) || (@dest > MAX_DEST) || (@r < 0) || (@r > MAX_R)

		pos =
		 case @int_map[@dest][@r]
		 when 0 then false
		 when 1 then true
     when 2 then @plain == 1 ? false : true
     when 5 then true
		 else false
		 end 

		if @plain == 2
			pos &&= ((@dest + 1) < MAX_DEST) && (@int_map[@dest+1][@r] != 0)
		elsif @plain == 3
			pos &&= ((@r + 1) < MAX_R) && (@int_map[@dest][@r+1] != 0)
		end

		pos
	end

	def print_position
		puts "Current location is [ #{@dest} , #{@r} ] at plain #{@plain}"
	end

	def print_map
		#header
		print "|---" * 14
		puts "|"

		@int_map.each do |row|
			line = row.join(" | ")
			puts "| #{line} |"
		end

		#footer
		print "|---" * 14
		puts "|"

		print_position
	end

	def give_possibilities
		res = []

		move_up
		res << UP if good_position?
		move_down

		move_down
		res << DOWN if good_position?
		move_up

		move_left
		res << LEFT if good_position?
		move_right

		move_right
		res << RIGHT if good_position?
		move_left

		res
	end

	def try_movements(movements, visited_states)

	    visited_states["#{@dest} #{@r} #{@plain}"] = true
	    res = false

	    return true if (@dest == 4) && (@r == 7)
      
		candidates = give_possibilities

		candidates.each do |candidate|
	      case candidate
	        when UP then
	          move_up

	          unless visited_states["#{@dest} #{@r} #{@plain}"] == true
	            movements << UP

	            res = try_movements(movements.clone, visited_states.clone)

	            if res
	              @sols.push(movements.clone)

	              if (@best_sol == -1) || (movements.length < @sols[@best_sol].length) 
	              	@best_sol = @sols.length - 1
	              end

	              res = false
	            end

	            movements.pop
	          end
	          move_down


	        when DOWN then
	          move_down

	          unless visited_states["#{@dest} #{@r} #{@plain}"] == true

	            movements << DOWN

	            res = try_movements(movements.clone, visited_states.clone)

	            if res
	              @sols.push(movements.clone)
	              
	              if (@best_sol == -1) || (movements.length < @sols[@best_sol].length) 
	              	@best_sol = @sols.length - 1
	              end

	              res = false
	            end

	            movements.pop
	          end
	          move_up

	        when LEFT then
	          move_left

	          unless visited_states["#{@dest} #{@r} #{@plain}"] == true

	            movements << LEFT

	            res = try_movements(movements.clone, visited_states.clone)

	            if res
	              @sols.push(movements.clone)
	              
	              if (@best_sol == -1) || (movements.length < @sols[@best_sol].length) 
	              	@best_sol = @sols.length - 1
	              end

	              res = false
	            end

	            movements.pop
	          end
	          move_right

	        when RIGHT then
	          move_right

	          unless visited_states["#{@dest} #{@r} #{@plain}"] == true

	            movements << RIGHT

	            res = try_movements(movements.clone, visited_states.clone)

	            if res
	              @sols.push(movements.clone)

	              if (@best_sol == -1) || (movements.length < @sols[@best_sol].length) 
	              	@best_sol = @sols.length - 1
	              end

	              res = false
	            end

	            movements.pop
	          end
	          move_left
	      end
		end

    	return res
  	end

  def print_solution
  	if @best_sol == -1  
  		puts "No solution"
  	else 
  		sol = @sols[@best_sol]
  		p sol
  		sol.each_index { |i| sol[i] += (i % 5) }

  		puts "Solution array:"
  		p sol

  		puts "To report:"
  		str = sol.join
  		str << 'A' * 45
  		puts str
  	end
  end
end

cube = Map.new

cube.print_map

moves = []
visited_states = {}

cube.try_movements(moves, visited_states)

cube.print_solution
