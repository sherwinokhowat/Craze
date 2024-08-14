
-- Foot profile

api_version = 2

Set = require('lib/set')
Sequence = require('lib/sequence')
Handlers = require("lib/way_handlers")
find_access_tag = require("lib/access").find_access_tag

function setup()
  local walking_speed = 500
  return {
    properties = {
      weight_name                   = 'duration',
      max_speed_for_map_matching    = 40/3.6, -- kmph -> m/s
      call_tagless_node_function    = false,
      traffic_light_penalty         = 2,
      u_turn_penalty                = 2,
      continue_straight_at_waypoint = false,
      use_turn_restrictions         = false,
      points_to_avoid               = {
       {lat = 43.66364961297999, lon = -79.39948578959384},
	{lat = 43.66364961297999, lon = -79.39948578959384},
	{lat = 43.66364961297999, lon = -79.39948578959384},
	{lat = 43.66400663158401, lon = -79.39830202709113},
	{lat = 43.66314512655015, lon = -79.40195944933241}
        -- Add more points as needed
      },
      proximity_threshold           = 0.1,  -- Distance threshold in degrees (approx. ~0.1km)
      proximity_penalty             = 300000
    },

    default_mode            = mode.walking,
    default_speed           = walking_speed,
    oneway_handling         = 'specific',     -- respect 'oneway:foot' but not 'oneway'

    barrier_blacklist = Set {
      'yes',
      'wall',
      'fence'
    },

    access_tag_whitelist = Set {
      'yes',
      'foot',
      'permissive',
      'designated'
    },

    access_tag_blacklist = Set {
      'no',
      'agricultural',
      'forestry',
      'private',
      'delivery',
    },

    restricted_access_tag_list = Set { },

    restricted_highway_whitelist = Set { },

    construction_whitelist = Set {},

    access_tags_hierarchy = Sequence {
      'foot',
      'access'
    },

    -- tags disallow access to in combination with highway=service
    service_access_tag_blacklist = Set { },

    restrictions = Sequence {
      'foot'
    },

    -- list of suffixes to suppress in name change instructions
    suffix_list = Set {
      'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'North', 'South', 'West', 'East'
    },

    avoid = Set {
      'impassable',
      'proposed'
    },

    speeds = Sequence {
      highway = {
        primary         = walking_speed,
        primary_link    = walking_speed,
        secondary       = walking_speed,
        secondary_link  = walking_speed,
        tertiary        = walking_speed,
        tertiary_link   = walking_speed,
        unclassified    = walking_speed,
        residential     = walking_speed,
        road            = walking_speed,
        living_street   = walking_speed,
        service         = walking_speed,
        track           = walking_speed,
        path            = walking_speed,
        steps           = walking_speed,
        pedestrian      = walking_speed,
        platform        = walking_speed,
        footway         = walking_speed,
        pier            = walking_speed,
      },

      railway = {
        platform        = walking_speed
      },

      amenity = {
        parking         = walking_speed,
        parking_entrance= walking_speed
      },

      man_made = {
        pier            = walking_speed
      },

      leisure = {
        track           = walking_speed
      }
    },

    route_speeds = {
      ferry = 5
    },

    bridge_speeds = {
    },

    surface_speeds = {
      fine_gravel =   walking_speed*0.75,
      gravel =        walking_speed*0.75,
      pebblestone =   walking_speed*0.75,
      mud =           walking_speed*0.5,
      sand =          walking_speed*0.5
    },

    tracktype_speeds = {
    },

    smoothness_speeds = {
    }
  }
end

function process_node(profile, node, result)
  -- parse access and barrier tags
  local access = find_access_tag(node, profile.access_tags_hierarchy)
  if access then
    if profile.access_tag_blacklist[access] then
      result.barrier = true
    end
  else
    local barrier = node:get_value_by_key("barrier")
    if barrier then
      --  make an exception for rising bollard barriers
      local bollard = node:get_value_by_key("bollard")
      local rising_bollard = bollard and "rising" == bollard

      if profile.barrier_blacklist[barrier] and not rising_bollard then
        result.barrier = true
      end
    end
  end

  -- check if node is a traffic light
  local tag = node:get_value_by_key("highway")
  if "traffic_signals" == tag then
    -- Direction should only apply to vehicles
    result.traffic_lights = true
  end
end

function getAllData(t, prevData)
  -- if prevData == nil, start empty, otherwise start with prevData
  local data = prevData or {}

  -- copy all the attributes from t
  for k,v in pairs(t) do
    data[k] = data[k] or v
  end

  -- get t's metatable, or exit if not existing
  local mt = getmetatable(t)
  if type(mt)~='table' then return data end

  -- get the __index from mt, or exit if not table
  local index = mt.__index
  if type(index)~='table' then return data end

  -- include the data from index into data, recursively, and return
  return getAllData(index, data)
end

-- main entry point for processing a way
function process_way(profile, way, result)
  -- the initial filtering of ways based on the presence of tags
  -- affects processing times significantly, because all ways
  -- have to be checked.
  -- to increase performance, prefetching and initial tag check
  -- is done directly instead of via a handler.

  -- in general we should  try to abort as soon as
  -- possible if the way is not routable, to avoid doing
  -- unnecessary work. this implies we should check things that
  -- commonly forbids access early, and handle edge cases later.

  -- data table for storing intermediate values during processing
  local data = {
    -- prefetch tags
    highway = way:get_value_by_key('highway'),
    bridge = way:get_value_by_key('bridge'),
    route = way:get_value_by_key('route'),
    leisure = way:get_value_by_key('leisure'),
    man_made = way:get_value_by_key('man_made'),
    railway = way:get_value_by_key('railway'),
    platform = way:get_value_by_key('platform'),
    amenity = way:get_value_by_key('amenity'),
    public_transport = way:get_value_by_key('public_transport')
  }

  -- perform a quick initial check and abort if the way is
  -- obviously not routable. here we require at least one
  -- of the prefetched tags to be present, i.e. the data table
  -- cannot be empty
  if next(data) == nil then     -- is the data table empty?
    return
  end

  local handlers = Sequence {
    -- set the default mode for this profile. it can be changed later
    -- in case it turns we're e.g. on a ferry
    WayHandlers.default_mode,

    -- check various tags that could indicate that the way is not
    -- routable. this includes things like status=impassable,
    -- toll=yes and oneway=reversible
    WayHandlers.blocked_ways,

    -- determine access status by checking our hierarchy of
    -- access tags, e.g: motorcar, motor_vehicle, vehicle
    WayHandlers.access,

    -- check whether forward/backward directions are routable
    WayHandlers.oneway,

    -- check whether forward/backward directions are routable
    WayHandlers.destinations,

    -- check whether we're using a special transport mode
    WayHandlers.ferries,
    WayHandlers.movables,

    -- compute speed taking into account way type, maxspeed tags, etc.
    WayHandlers.speed,
    WayHandlers.surface,

    -- handle turn lanes and road classification, used for guidance
    WayHandlers.classification,

    -- handle various other flags
    WayHandlers.roundabouts,
    WayHandlers.startpoint,

    -- set name, ref and pronunciation
    WayHandlers.names,

    -- set weight properties of the way
    WayHandlers.weights
  }

  WayHandlers.run(profile, way, result, data, handlers)
  
end

function process_segment (profile, segment)
  local points_to_avoid = profile.properties.points_to_avoid
  local threshold = profile.properties.proximity_threshold
  local lat2 = segment.source.lat
  local lon2 = segment.source.lon
  
  segment.weight = segment.distance

  for _, point in ipairs(points_to_avoid) do
        local lat1 = point.lat
        local lon1 = point.lon
        if calculate_distance(lat1, lon1, lat2, lon2) < threshold then
          segment.weight = segment.weight * 50
          break
        end
      end
end

function process_turn (profile, turn)
  turn.duration = 0.
  turn.weight = 0.
end

-- Haversine formula to calculate distance between two lat/lon points
function calculate_distance(lat1, lon1, lat2, lon2)
    local R = 6371 -- Earth radius in kilometers
    local dLat = math.rad(lat2 - lat1)
    local dLon = math.rad(lon2 - lon1)
    local a = math.sin(dLat/2) * math.sin(dLat/2) +
              math.cos(math.rad(lat1)) * math.cos(math.rad(lat2)) *
              math.sin(dLon/2) * math.sin(dLon/2)
    local c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    local distance = R * c
    return distance
end

return {
  setup = setup,
  process_way =  process_way,
  process_node = process_node,
  process_turn = process_turn,
  process_segment = process_segment,
}

